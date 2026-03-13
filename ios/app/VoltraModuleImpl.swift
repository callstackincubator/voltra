import ActivityKit
import Compression
import ExpoModulesCore
import Foundation
import WidgetKit

/// Implementation details for VoltraModule to keep the main module file clean
public class VoltraModuleImpl {
  private let liveActivityService = VoltraLiveActivityService()

  public init() {
    // Clean up data for widgets that are no longer installed
    cleanupOrphanedWidgetData()
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
      print("Error starting Voltra instance: \(error)")
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
        print("[Voltra] Reloaded Live Activity '\(activity.attributes.name)'")
      } catch {
        print("[Voltra] Failed to reload Live Activity '\(activity.attributes.name)': \(error)")
      }
    }
  }

  // MARK: - Image Preloading

  func preloadImages(images: [PreloadImageOptions]) async -> PreloadImagesResult {
    await VoltraImagePreload.preloadImages(images: images)
  }

  func clearPreloadedImages(keys: [String]?) async {
    await VoltraImagePreload.clearPreloadedImages(keys: keys)
  }

  // MARK: - Widgets

  func updateWidget(widgetId: String, jsonString: String, options: UpdateWidgetOptions?) async throws {
    try writeWidgetData(widgetId: widgetId, jsonString: jsonString, deepLinkUrl: options?.deepLinkUrl)

    // Clear any scheduled timeline so single-entry data takes effect
    clearWidgetTimeline(widgetId: widgetId)

    // Reload the widget timeline
    WidgetCenter.shared.reloadTimelines(ofKind: "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)")
    print("[Voltra] Updated widget '\(widgetId)'")
  }

  func scheduleWidget(widgetId: String, timelineJson: String) async throws {
    try writeWidgetTimeline(widgetId: widgetId, timelineJson: timelineJson)

    // Reload the widget timeline to pick up scheduled entries
    WidgetCenter.shared.reloadTimelines(ofKind: "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)")
  }

  func reloadWidgets(widgetIds: [String]?) async {
    if let ids = widgetIds, !ids.isEmpty {
      for widgetId in ids {
        WidgetCenter.shared.reloadTimelines(ofKind: "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)")
      }
      print("[Voltra] Reloaded widgets: \(ids.joined(separator: ", "))")
    } else {
      WidgetCenter.shared.reloadAllTimelines()
      print("[Voltra] Reloaded all widgets")
    }
  }

  func clearWidget(widgetId: String) async {
    clearWidgetData(widgetId: widgetId)
    WidgetCenter.shared.reloadTimelines(ofKind: "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)")
    print("[Voltra] Cleared widget '\(widgetId)'")
  }

  func clearAllWidgets() async {
    clearAllWidgetData()
    WidgetCenter.shared.reloadAllTimelines()
    print("[Voltra] Cleared all widgets")
  }

  func getActiveWidgets() async throws -> [[String: String]] {
    try await withCheckedThrowingContinuation { continuation in
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case let .success(widgetInfos):
          let mapped = widgetInfos.map { widget -> [String: String] in
            let prefix = VoltraStorageKeys.widgetKindPrefix
            let name = widget.kind.hasPrefix(prefix)
              ? String(widget.kind.dropFirst(prefix.count))
              : widget.kind

            return [
              "name": name,
              "kind": widget.kind,
              "family": self.mapWidgetFamily(widget.family),
            ]
          }
          continuation.resume(returning: mapped)
        case let .failure(error):
          continuation.resume(throwing: error)
        }
      }
    }
  }

  func setWidgetServerCredentials(token: String, headers: [String: String]?) {
    VoltraKeychainHelper.saveToken(token)
    if let headers = headers {
      VoltraKeychainHelper.saveHeaders(headers)
    } else {
      VoltraKeychainHelper.deleteHeaders()
    }
    print("[Voltra] Widget server credentials saved to Keychain")

    // Reload all widgets so they can pick up the new credentials immediately
    WidgetCenter.shared.reloadAllTimelines()
  }

  func clearWidgetServerCredentials() {
    VoltraKeychainHelper.clearAll()
    print("[Voltra] Widget server credentials cleared from Keychain")

    WidgetCenter.shared.reloadAllTimelines()
  }

  // MARK: - Private Helpers

  private func mapWidgetFamily(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "systemSmall"
    case .systemMedium: return "systemMedium"
    case .systemLarge: return "systemLarge"
    case .systemExtraLarge: return "systemExtraLarge"
    case .accessoryCircular: return "accessoryCircular"
    case .accessoryRectangular: return "accessoryRectangular"
    case .accessoryInline: return "accessoryInline"
    @unknown default: return "unknown"
    }
  }

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
    print("Compressed payload size: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(hardCap)B)")

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

  private func writeWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) throws {
    try VoltraWidgetDefaults.setWidgetJson(jsonString, for: widgetId, deepLinkUrl: deepLinkUrl)
  }

  private func writeWidgetTimeline(widgetId: String, timelineJson: String) throws {
    try VoltraWidgetDefaults.setTimeline(timelineJson, for: widgetId)
    print("[Voltra] writeWidgetTimeline: Timeline stored successfully")
  }

  private func clearWidgetData(widgetId: String) {
    VoltraWidgetDefaults.removeAllData(for: widgetId)
  }

  private func clearAllWidgetData() {
    VoltraWidgetDefaults.removeAllWidgets()
  }

  private func clearWidgetTimeline(widgetId: String) {
    VoltraWidgetDefaults.removeTimeline(for: widgetId)
  }

  private func cleanupOrphanedWidgetData() {
    let knownWidgetIds = Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.widgetIds) as? [String] ?? []
    guard !knownWidgetIds.isEmpty else { return }

    WidgetCenter.shared.getCurrentConfigurations { result in
      guard case let .success(configs) = result else { return }

      let installedIds = Set(configs.compactMap { config -> String? in
        let prefix = VoltraStorageKeys.widgetKindPrefix
        guard config.kind.hasPrefix(prefix) else { return nil }
        return String(config.kind.dropFirst(prefix.count))
      })

      for widgetId in knownWidgetIds where !installedIds.contains(widgetId) {
        VoltraWidgetDefaults.removeAllData(for: widgetId)
        print("[Voltra] Cleaned up orphaned widget data for '\(widgetId)'")
      }
    }
  }
}

