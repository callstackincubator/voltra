import ActivityKit
import Compression
import ExpoModulesCore
import Foundation
import os

/// Implementation details for VoltraModule to keep the main module file clean
public class VoltraModuleImpl {
  private let liveActivityService = VoltraLiveActivityService()

  public init() {
    // Clean up data for widgets that are no longer installed
    VoltraWidgetService.cleanupOrphanedData()
  }

  func isHeadless() -> Bool {
    if Thread.isMainThread {
      return UIApplication.shared.applicationState == .background
    }
    return DispatchQueue.main.sync {
      UIApplication.shared.applicationState == .background
    }
  }

  var pushNotificationsEnabled: Bool {
    // Support both keys for compatibility with older plugin and new Voltra naming
    let main = Bundle.main
    return main.object(forInfoDictionaryKey: VoltraStorageKeys.enablePushNotifications) as? Bool ?? false
  }

  // MARK: - Lifecycle & Monitoring

  func startMonitoring() {
    // Note: Event bus subscription is handled by VoltraModule since it has access to sendEvent()
    liveActivityService.startMonitoring(enablePush: pushNotificationsEnabled)
  }

  func stopMonitoring() {
    VoltraEventBus.shared.unsubscribe()
    liveActivityService.stopMonitoring()
  }

  // MARK: - Live Activities

  func startLiveActivity(jsonString: String, options: StartVoltraOptions?) async throws -> String {
    guard #available(iOS 16.2, *) else { throw VoltraModule.VoltraErrors.unsupportedOS }
    guard VoltraLiveActivityService.areActivitiesEnabled() else {
      throw VoltraModule.VoltraErrors.liveActivitiesNotEnabled
    }

    do {
      // Compress JSON using brotli level 2
      let compressedJson = try BrotliCompression.compress(jsonString: jsonString)
      try validatePayloadSize(compressedJson, operation: "start")

      let activityName = options?.activityName?.trimmingCharacters(in: .whitespacesAndNewlines)

      // Extract staleDate and relevanceScore from options
      let staleDate: Date? = {
        if let staleDateMs = options?.staleDate {
          return Date(timeIntervalSince1970: staleDateMs / 1000.0)
        }
        return nil
      }()
      let relevanceScore: Double = options?.relevanceScore ?? 0.0

      let pushType = try resolvePushType(channelId: options?.channelId)

      // Create request struct with compressed JSON
      let createRequest = CreateActivityRequest(
        activityId: activityName,
        deepLinkUrl: options?.deepLinkUrl,
        jsonString: compressedJson,
        staleDate: staleDate,
        relevanceScore: relevanceScore,
        pushType: pushType,
        endExistingWithSameName: true
      )

      // Create activity using service
      return try await liveActivityService.createActivity(createRequest)
    } catch {
      VoltraLogger.module.error("startLiveActivity failed: \(error)")
      throw mapError(error)
    }
  }

  func updateLiveActivity(activityId: String, jsonString: String, options: UpdateVoltraOptions?) async throws {
    guard #available(iOS 16.2, *) else { throw VoltraModule.VoltraErrors.unsupportedOS }

    // Compress JSON using brotli level 2
    let compressedJson = try BrotliCompression.compress(jsonString: jsonString)
    try validatePayloadSize(compressedJson, operation: "update")

    // Extract staleDate and relevanceScore from options
    let staleDate: Date? = {
      if let staleDateMs = options?.staleDate {
        return Date(timeIntervalSince1970: staleDateMs / 1000.0)
      }
      return nil
    }()
    let relevanceScore: Double = options?.relevanceScore ?? 0.0

    // Create update request struct with compressed JSON
    let updateRequest = UpdateActivityRequest(
      jsonString: compressedJson,
      staleDate: staleDate,
      relevanceScore: relevanceScore
    )

    do {
      try await liveActivityService.updateActivity(byName: activityId, request: updateRequest)
    } catch {
      throw mapError(error)
    }
  }

  func endLiveActivity(activityId: String, options: EndVoltraOptions?) async throws {
    guard #available(iOS 16.2, *) else { throw VoltraModule.VoltraErrors.unsupportedOS }

    // Convert dismissal policy options to ActivityKit type
    let dismissalPolicy = convertToActivityKitDismissalPolicy(options?.dismissalPolicy)

    do {
      try await liveActivityService.endActivity(byName: activityId, dismissalPolicy: dismissalPolicy)
    } catch {
      throw mapError(error)
    }
  }

  func endAllLiveActivities() async throws {
    guard #available(iOS 16.2, *) else { throw VoltraModule.VoltraErrors.unsupportedOS }
    await liveActivityService.endAllActivities()
  }

  func getLatestVoltraActivityId() -> String? {
    guard #available(iOS 16.2, *) else { return nil }
    return liveActivityService.getLatestActivity()?.id
  }

  func listVoltraActivityIds() -> [String] {
    guard #available(iOS 16.2, *) else { return [] }
    return liveActivityService.getAllActivities().map(\.id)
  }

  func isLiveActivityActive(name: String) -> Bool {
    guard #available(iOS 16.2, *) else { return false }
    return liveActivityService.isActivityActive(name: name)
  }

  func reloadLiveActivities(activityNames: [String]?) async throws {
    guard #available(iOS 16.2, *) else { throw VoltraModule.VoltraErrors.unsupportedOS }

    let activities = liveActivityService.getAllActivities()

    for activity in activities {
      // If activityNames is provided, only reload those specific activities
      if let names = activityNames, !names.isEmpty {
        guard names.contains(activity.attributes.name) else { continue }
      }

      do {
        let newState = try VoltraAttributes.ContentState(
          uiJsonData: activity.content.state.uiJsonData
        )

        await activity.update(
          ActivityContent(
            state: newState,
            staleDate: nil,
            relevanceScore: 0.0
          )
        )
        VoltraLogger.activity.info("Reloaded Live Activity '\(activity.attributes.name)'")
      } catch {
        VoltraLogger.activity.error("Failed to reload Live Activity '\(activity.attributes.name)': \(error)")
      }
    }
  }

  // MARK: - Image Preloading

  func preloadImages(images: [PreloadImageOptions]) async throws -> PreloadImagesResult {
    try await VoltraImagePreload.preloadImages(images: images)
  }

  func clearPreloadedImages(keys: [String]?) async {
    await VoltraImagePreload.clearPreloadedImages(keys: keys)
  }

  // MARK: - Widgets

  func updateWidget(widgetId: String, jsonString: String, options: UpdateWidgetOptions?) async throws {
    try VoltraWidgetService.setWidgetData(widgetId: widgetId, jsonString: jsonString, deepLinkUrl: options?.deepLinkUrl)

    // Clear any scheduled timeline so single-entry data takes effect
    VoltraWidgetService.removeTimeline(for: widgetId)

    // Reload the widget timeline
    VoltraWidgetService.reloadTimeline(for: widgetId)
  }

  func scheduleWidget(widgetId: String, timelineJson: String) async throws {
    try VoltraWidgetService.setTimeline(widgetId: widgetId, timelineJson: timelineJson)

    // Reload the widget timeline to pick up scheduled entries
    VoltraWidgetService.reloadTimeline(for: widgetId)
  }

  func reloadWidgets(widgetIds: [String]?) async {
    if let ids = widgetIds, !ids.isEmpty {
      for widgetId in ids {
        VoltraWidgetService.reloadTimeline(for: widgetId)
      }
    } else {
      VoltraWidgetService.reloadAllTimelines()
    }
  }

  func clearWidget(widgetId: String) async {
    VoltraWidgetService.removeAllData(for: widgetId)
    VoltraWidgetService.reloadTimeline(for: widgetId)
  }

  func clearAllWidgets() async {
    VoltraWidgetService.removeAllWidgets()
    VoltraWidgetService.reloadAllTimelines()
  }

  func getActiveWidgets() async throws -> [[String: String]] {
    try await VoltraWidgetService.getActiveWidgets()
  }

  func setWidgetServerCredentials(token: String, headers: [String: String]?) {
    VoltraWidgetService.setWidgetServerCredentials(token: token, headers: headers)
  }

  func clearWidgetServerCredentials() {
    VoltraWidgetService.clearWidgetServerCredentials()
  }

  // MARK: - Private Helpers

  private func mapError(_ error: Error) -> Error {
    if let moduleError = error as? VoltraModule.VoltraErrors {
      return moduleError
    }

    if let serviceError = error as? VoltraLiveActivityError {
      switch serviceError {
      case .unsupportedOS:
        return VoltraModule.VoltraErrors.unsupportedOS
      case .liveActivitiesNotEnabled:
        return VoltraModule.VoltraErrors.liveActivitiesNotEnabled
      case .notFound:
        return VoltraModule.VoltraErrors.notFound
      }
    }
    return VoltraModule.VoltraErrors.unexpectedError(error)
  }

  private func resolvePushType(channelId rawChannelId: String?) throws -> PushType? {
    guard let rawChannelId else {
      return pushNotificationsEnabled ? .token : nil
    }

    let channelId = rawChannelId.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !channelId.isEmpty else {
      throw VoltraModule.VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: -20,
          userInfo: [NSLocalizedDescriptionKey: "channelId must be a non-empty string."]
        )
      )
    }

    guard pushNotificationsEnabled else {
      throw VoltraModule.VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: -21,
          userInfo: [NSLocalizedDescriptionKey: "channelId requires enablePushNotifications: true in the Voltra plugin config."]
        )
      )
    }

    if #available(iOS 18.0, *) {
      return .channel(channelId)
    }

    // On iOS <18, broadcast channels are unavailable, so fall back to token-based updates.
    return .token
  }

  private func validatePayloadSize(_ compressedPayload: String, operation: String) throws {
    let dataSize = compressedPayload.utf8.count
    let safeBudget = VoltraConstants.compressedPayloadSafeBudget
    let hardCap = VoltraConstants.maxPayloadSizeBytes
    VoltraLogger.module.debug("Compressed payload: \(dataSize)B (budget \(safeBudget)B, hard cap \(hardCap)B)")

    if dataSize > safeBudget {
      throw VoltraModule.VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: operation == "start" ? -10 : -11,
          userInfo: [NSLocalizedDescriptionKey: "Compressed payload too large: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(hardCap)B). Reduce the UI before \(operation == "start" ? "starting" : "updating") the Live Activity."]
        )
      )
    }
  }

  private func convertToActivityKitDismissalPolicy(_ options: DismissalPolicyOptions?) -> ActivityUIDismissalPolicy {
    guard let options = options else {
      return .immediate
    }

    switch options.type {
    case "immediate":
      return .immediate
    case "after":
      if let timestamp = options.date {
        let date = Date(timeIntervalSince1970: timestamp / 1000.0)
        return .after(date)
      }
      return .immediate
    default:
      return .immediate
    }
  }
}
