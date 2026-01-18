import ActivityKit
import Compression
import ExpoModulesCore
import Foundation
import WidgetKit

public class VoltraModule: Module {
  private let MAX_PAYLOAD_SIZE_IN_BYTES = 4096
  private let WIDGET_JSON_WARNING_SIZE = 50000 // 50KB per widget
  private let TIMELINE_WARNING_SIZE = 100_000 // 100KB per timeline
  private let liveActivityService = VoltraLiveActivityService()
  private var wasLaunchedInBackground: Bool = false
  private var monitoredActivityIds: Set<String> = []

  enum VoltraErrors: Error {
    case unsupportedOS
    case notFound
    case liveActivitiesNotEnabled
    case unexpectedError(Error)
  }

  private func validatePayloadSize(_ compressedPayload: String, operation: String) throws {
    let dataSize = compressedPayload.utf8.count
    let safeBudget = 3345 // Keep existing safe budget
    print("Compressed payload size: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B)")

    if dataSize > safeBudget {
      throw VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: operation == "start" ? -10 : -11,
          userInfo: [NSLocalizedDescriptionKey: "Compressed payload too large: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B). Reduce the UI before \(operation == "start" ? "starting" : "updating") the Live Activity."]
        )
      )
    }
  }

  public func definition() -> ModuleDefinition {
    Name("VoltraModule")

    // UI component events forwarded from the extension + push/state events
    Events("interaction", "activityTokenReceived", "activityPushToStartTokenReceived", "stateChange")

    OnStartObserving {
      VoltraEventBus.shared.subscribe { [weak self] eventType, eventData in
        self?.sendEvent(eventType, eventData)
      }

      if pushNotificationsEnabled {
        observePushToStartToken()
      }

      observeLiveActivityUpdates()
    }

    OnStopObserving {
      VoltraEventBus.shared.unsubscribe()
      monitoredActivityIds.removeAll()
    }

    OnCreate {
      // Track if app was launched in background (headless)
      wasLaunchedInBackground = UIApplication.shared.applicationState == .background

      // Clean up data for widgets that are no longer installed
      cleanupOrphanedWidgetData()
    }

    AsyncFunction("startLiveActivity") { (jsonString: String, options: StartVoltraOptions?) async throws -> String in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      guard VoltraLiveActivityService.areActivitiesEnabled() else {
        throw VoltraErrors.liveActivitiesNotEnabled
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

        // Create request struct with compressed JSON
        let createRequest = CreateActivityRequest(
          activityId: activityName,
          deepLinkUrl: options?.deepLinkUrl,
          jsonString: compressedJson,
          staleDate: staleDate,
          relevanceScore: relevanceScore,
          pushType: pushNotificationsEnabled ? .token : nil,
          endExistingWithSameName: true
        )

        // Create activity using service
        let finalActivityId = try await liveActivityService.createActivity(createRequest)

        return finalActivityId
      } catch {
        print("Error starting Voltra instance: \(error)")
        // Map service errors to module errors
        if let serviceError = error as? VoltraLiveActivityError {
          switch serviceError {
          case .unsupportedOS:
            throw VoltraErrors.unsupportedOS
          case .liveActivitiesNotEnabled:
            throw VoltraErrors.liveActivitiesNotEnabled
          case .notFound:
            throw VoltraErrors.notFound
          }
        }
        throw VoltraErrors.unexpectedError(error)
      }
    }

    AsyncFunction("updateLiveActivity") { (activityId: String, jsonString: String, options: UpdateVoltraOptions?) async throws in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }

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
        if let serviceError = error as? VoltraLiveActivityError {
          switch serviceError {
          case .unsupportedOS:
            throw VoltraErrors.unsupportedOS
          case .notFound:
            throw VoltraErrors.notFound
          case .liveActivitiesNotEnabled:
            throw VoltraErrors.liveActivitiesNotEnabled
          }
        }
        throw VoltraErrors.unexpectedError(error)
      }
    }

    AsyncFunction("endLiveActivity") { (activityId: String, options: EndVoltraOptions?) async throws in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }

      // Convert dismissal policy options to ActivityKit type
      let dismissalPolicy = convertToActivityKitDismissalPolicy(options?.dismissalPolicy)

      do {
        try await liveActivityService.endActivity(byName: activityId, dismissalPolicy: dismissalPolicy)
      } catch {
        if let serviceError = error as? VoltraLiveActivityError {
          switch serviceError {
          case .unsupportedOS:
            throw VoltraErrors.unsupportedOS
          case .notFound:
            throw VoltraErrors.notFound
          case .liveActivitiesNotEnabled:
            throw VoltraErrors.liveActivitiesNotEnabled
          }
        }
        throw VoltraErrors.unexpectedError(error)
      }
    }

    // Preferred name mirroring iOS terminology
    AsyncFunction("endAllLiveActivities") { () async throws in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      await liveActivityService.endAllActivities()
    }

    // Return the latest (most recently created) Voltra Live Activity ID, if any.
    // Useful to rebind after Fast Refresh in development.
    AsyncFunction("getLatestVoltraActivityId") { () -> String? in
      guard #available(iOS 16.2, *) else { return nil }
      return liveActivityService.getLatestActivity()?.id
    }

    // Debug helper: list all running Voltra Live Activity IDs
    AsyncFunction("listVoltraActivityIds") { () -> [String] in
      guard #available(iOS 16.2, *) else { return [] }
      return liveActivityService.getAllActivities().map(\.id)
    }

    Function("isLiveActivityActive") { (activityName: String) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return liveActivityService.isActivityActive(name: activityName)
    }

    Function("isHeadless") { () -> Bool in
      return wasLaunchedInBackground
    }

    // Preload images to App Group storage for use in Live Activities
    AsyncFunction("preloadImages") { (images: [PreloadImageOptions]) async throws -> PreloadImagesResult in
      var succeeded: [String] = []
      var failed: [PreloadImageFailure] = []

      for imageOptions in images {
        do {
          try await self.downloadAndSaveImage(imageOptions)
          succeeded.append(imageOptions.key)
        } catch {
          failed.append(PreloadImageFailure(key: imageOptions.key, error: error.localizedDescription))
        }
      }

      return PreloadImagesResult(succeeded: succeeded, failed: failed)
    }

    // Reload Live Activities to pick up preloaded images
    // This triggers an update with the same content state, forcing SwiftUI to re-render
    AsyncFunction("reloadLiveActivities") { (activityNames: [String]?) async throws in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }

      let activities = self.liveActivityService.getAllActivities()

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
              staleDate: activity.content.staleDate,
              relevanceScore: activity.content.relevanceScore
            )
          )
          print("[Voltra] Reloaded Live Activity '\(activity.attributes.name)'")
        } catch {
          print("[Voltra] Failed to reload Live Activity '\(activity.attributes.name)': \(error)")
        }
      }
    }

    // Clear preloaded images from App Group storage
    AsyncFunction("clearPreloadedImages") { (keys: [String]?) async in
      if let keys = keys, !keys.isEmpty {
        // Clear specific images
        VoltraImageStore.removeImages(keys: keys)
        print("[Voltra] Cleared preloaded images: \(keys.joined(separator: ", "))")
      } else {
        // Clear all preloaded images
        VoltraImageStore.clearAll()
        print("[Voltra] Cleared all preloaded images")
      }
    }

    // MARK: - Home Screen Widget Functions

    // Update a home screen widget with new content
    AsyncFunction("updateWidget") { (widgetId: String, jsonString: String, options: UpdateWidgetOptions?) async throws in
      try self.writeWidgetData(widgetId: widgetId, jsonString: jsonString, deepLinkUrl: options?.deepLinkUrl)

      // Clear any scheduled timeline so single-entry data takes effect
      self.clearWidgetTimeline(widgetId: widgetId)

      // Reload the widget timeline
      WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
      print("[Voltra] Updated widget '\(widgetId)'")
    }

    // Schedule a widget timeline with multiple entries
    AsyncFunction("scheduleWidget") { (widgetId: String, timelineJson: String) async throws in
      try self.writeWidgetTimeline(widgetId: widgetId, timelineJson: timelineJson)

      // Reload the widget timeline to pick up scheduled entries
      WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
    }

    // Reload widget timelines to refresh their content
    AsyncFunction("reloadWidgets") { (widgetIds: [String]?) async in
      if let ids = widgetIds, !ids.isEmpty {
        for widgetId in ids {
          WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
        }
        print("[Voltra] Reloaded widgets: \(ids.joined(separator: ", "))")
      } else {
        WidgetCenter.shared.reloadAllTimelines()
        print("[Voltra] Reloaded all widgets")
      }
    }

    // Clear a widget's stored data
    AsyncFunction("clearWidget") { (widgetId: String) async in
      self.clearWidgetData(widgetId: widgetId)
      WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
      print("[Voltra] Cleared widget '\(widgetId)'")
    }

    // Clear all widgets' stored data
    AsyncFunction("clearAllWidgets") { () async in
      self.clearAllWidgetData()
      WidgetCenter.shared.reloadAllTimelines()
      print("[Voltra] Cleared all widgets")
    }

    View(VoltraRN.self) {
      Prop("payload") { (view, payload: String) in
        view.setPayload(payload)
      }

      Prop("viewId") { (view, viewId: String) in
        view.setViewId(viewId)
      }
    }
  }
}

// Convert dismissal policy options to ActivityKit type
private extension VoltraModule {
  func convertToActivityKitDismissalPolicy(_ options: DismissalPolicyOptions?) -> ActivityUIDismissalPolicy {
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

// MARK: - Image Preloading

private extension VoltraModule {
  /// Download and save an image to App Group storage
  func downloadAndSaveImage(_ options: PreloadImageOptions) async throws {
    guard let url = URL(string: options.url) else {
      throw PreloadError.invalidURL(options.url)
    }

    // Create request with optional method and headers
    var request = URLRequest(url: url)
    request.httpMethod = options.method ?? "GET"

    if let headers = options.headers {
      for (key, value) in headers {
        request.setValue(value, forHTTPHeaderField: key)
      }
    }

    // Perform the request
    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw PreloadError.invalidResponse
    }

    guard (200 ... 299).contains(httpResponse.statusCode) else {
      throw PreloadError.httpError(statusCode: httpResponse.statusCode)
    }

    // Check Content-Length header first if available
    if let contentLengthString = httpResponse.value(forHTTPHeaderField: "Content-Length"),
       let contentLength = Int(contentLengthString)
    {
      if contentLength >= MAX_PAYLOAD_SIZE_IN_BYTES {
        throw PreloadError.imageTooLarge(key: options.key, size: contentLength)
      }
    }

    // Also validate actual data size (in case Content-Length was missing or inaccurate)
    if data.count >= MAX_PAYLOAD_SIZE_IN_BYTES {
      throw PreloadError.imageTooLarge(key: options.key, size: data.count)
    }

    // Validate that the data is actually an image
    guard UIImage(data: data) != nil else {
      throw PreloadError.invalidImageData(key: options.key)
    }

    // Save to App Group storage
    try VoltraImageStore.saveImage(data, key: options.key)

    print("[Voltra] Preloaded image '\(options.key)' (\(data.count) bytes)")
  }
}

/// Errors that can occur during image preloading
enum PreloadError: Error, LocalizedError {
  case invalidURL(String)
  case invalidResponse
  case httpError(statusCode: Int)
  case imageTooLarge(key: String, size: Int)
  case invalidImageData(key: String)
  case appGroupNotConfigured

  var errorDescription: String? {
    switch self {
    case let .invalidURL(url):
      return "Invalid URL: \(url)"
    case .invalidResponse:
      return "Invalid response from server"
    case let .httpError(statusCode):
      return "HTTP error: \(statusCode)"
    case let .imageTooLarge(key, size):
      return "Image '\(key)' is too large: \(size) bytes (max 4096 bytes for Live Activities)"
    case let .invalidImageData(key):
      return "Invalid image data for '\(key)'"
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin."
    }
  }
}

// MARK: - Widget Data Management

private extension VoltraModule {
  func writeWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) throws {
    guard let groupId = VoltraConfig.groupIdentifier() else {
      throw WidgetError.appGroupNotConfigured
    }
    guard let defaults = UserDefaults(suiteName: groupId) else {
      throw WidgetError.userDefaultsUnavailable
    }

    // Check payload size and log warning if too large
    let dataSize = jsonString.utf8.count
    if dataSize > WIDGET_JSON_WARNING_SIZE {
      print("[Voltra] ⚠️ Large widget payload for '\(widgetId)': \(dataSize) bytes (warning threshold: \(WIDGET_JSON_WARNING_SIZE) bytes)")
    }

    // Store the JSON payload
    defaults.set(jsonString, forKey: "Voltra_Widget_JSON_\(widgetId)")

    // Store or remove deep link URL
    if let url = deepLinkUrl, !url.isEmpty {
      defaults.set(url, forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    } else {
      defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    }

    defaults.synchronize()
  }

  func writeWidgetTimeline(widgetId: String, timelineJson: String) throws {
    guard let groupId = VoltraConfig.groupIdentifier() else {
      throw WidgetError.appGroupNotConfigured
    }
    guard let defaults = UserDefaults(suiteName: groupId) else {
      throw WidgetError.userDefaultsUnavailable
    }

    // Check timeline size and log warning if too large
    let dataSize = timelineJson.utf8.count
    if dataSize > TIMELINE_WARNING_SIZE {
      print("[Voltra] ⚠️ Large timeline for '\(widgetId)': \(dataSize) bytes (warning threshold: \(TIMELINE_WARNING_SIZE) bytes)")
    }

    // Store the timeline JSON
    defaults.set(timelineJson, forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
    print("[Voltra] writeWidgetTimeline: Timeline stored successfully")
  }

  func clearWidgetData(widgetId: String) {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    defaults.removeObject(forKey: "Voltra_Widget_JSON_\(widgetId)")
    defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
  }

  func clearAllWidgetData() {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    // Get all widget IDs from Info.plist
    let widgetIds = Bundle.main.object(forInfoDictionaryKey: "Voltra_WidgetIds") as? [String] ?? []

    for widgetId in widgetIds {
      defaults.removeObject(forKey: "Voltra_Widget_JSON_\(widgetId)")
      defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
      defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    }
    defaults.synchronize()
  }

  func clearWidgetTimeline(widgetId: String) {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
  }

  func cleanupOrphanedWidgetData() {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    let knownWidgetIds = Bundle.main.object(forInfoDictionaryKey: "Voltra_WidgetIds") as? [String] ?? []
    guard !knownWidgetIds.isEmpty else { return }

    WidgetCenter.shared.getCurrentConfigurations { result in
      guard case let .success(configs) = result else { return }

      let installedIds = Set(configs.compactMap { config -> String? in
        let prefix = "Voltra_Widget_"
        guard config.kind.hasPrefix(prefix) else { return nil }
        return String(config.kind.dropFirst(prefix.count))
      })

      for widgetId in knownWidgetIds where !installedIds.contains(widgetId) {
        defaults.removeObject(forKey: "Voltra_Widget_JSON_\(widgetId)")
        defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
        defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
        print("[Voltra] Cleaned up orphaned widget data for '\(widgetId)'")
      }
    }
  }
}

/// Errors that can occur during widget operations
enum WidgetError: Error, LocalizedError {
  case appGroupNotConfigured
  case userDefaultsUnavailable

  var errorDescription: String? {
    switch self {
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin to use widgets."
    case .userDefaultsUnavailable:
      return "Unable to access UserDefaults for the app group."
    }
  }
}

// MARK: - Push Tokens and Activity State Streams

private extension VoltraModule {
  var pushNotificationsEnabled: Bool {
    // Support both keys for compatibility with older plugin and new Voltra naming
    let main = Bundle.main
    return main.object(forInfoDictionaryKey: "Voltra_EnablePushNotifications") as? Bool ?? false
  }

  func observePushToStartToken() {
    guard #available(iOS 17.2, *), ActivityAuthorizationInfo().areActivitiesEnabled else { return }

    // Check for initial token if available
    if let initialTokenData = Activity<VoltraAttributes>.pushToStartToken {
      let token = initialTokenData.hexString
      VoltraEventBus.shared.send(.pushToStartTokenReceived(token: token))
    }

    // Observe token updates
    Task {
      for await tokenData in Activity<VoltraAttributes>.pushToStartTokenUpdates {
        let token = tokenData.hexString
        VoltraEventBus.shared.send(.pushToStartTokenReceived(token: token))
      }
    }
  }

  func observeLiveActivityUpdates() {
    guard #available(iOS 16.2, *) else { return }

    // 1. Handle currently existing activities (e.g., after app restart)
    for activity in Activity<VoltraAttributes>.activities {
      monitorActivity(activity)
    }

    // 2. Listen for NEW activities created in the future (e.g., push-to-start)
    Task {
      for await newActivity in Activity<VoltraAttributes>.activityUpdates {
        monitorActivity(newActivity)
      }
    }
  }

  /// Set up observers for an activity's lifecycle (only once per activity)
  private func monitorActivity(_ activity: Activity<VoltraAttributes>) {
    let activityId = activity.id

    // Skip if we're already monitoring this activity
    guard !monitoredActivityIds.contains(activityId) else { return }
    monitoredActivityIds.insert(activityId)

    // Observe lifecycle state changes (active → dismissed → ended)
    Task {
      for await state in activity.activityStateUpdates {
        VoltraEventBus.shared.send(
          .stateChange(
            activityName: activity.attributes.name,
            state: String(describing: state)
          )
        )
      }
    }

    // Observe push token updates if enabled
    if pushNotificationsEnabled {
      Task {
        for await pushTokenData in activity.pushTokenUpdates {
          let pushTokenString = pushTokenData.hexString
          VoltraEventBus.shared.send(
            .tokenReceived(
              activityName: activity.attributes.name,
              pushToken: pushTokenString
            )
          )
        }
      }
    }
  }
}
