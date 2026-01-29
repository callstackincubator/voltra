import ActivityKit
import Compression
import ExpoModulesCore
import Foundation
import WidgetKit

/// Implementation details for VoltraModule to keep the main module file clean
public class VoltraModuleImpl {
  private let MAX_PAYLOAD_SIZE_IN_BYTES = 4096
  private let WIDGET_JSON_WARNING_SIZE = 50000 // 50KB per widget
  private let TIMELINE_WARNING_SIZE = 100_000 // 100KB per timeline
  private let liveActivityService = VoltraLiveActivityService()

  public var wasLaunchedInBackground: Bool = false

  public init() {
    // Track if app was launched in background (headless)
    wasLaunchedInBackground = UIApplication.shared.applicationState == .background

    // Clean up data for widgets that are no longer installed
    cleanupOrphanedWidgetData()
  }

  var pushNotificationsEnabled: Bool {
    // Support both keys for compatibility with older plugin and new Voltra naming
    let main = Bundle.main
    return main.object(forInfoDictionaryKey: "Voltra_EnablePushNotifications") as? Bool ?? false
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

  func preloadImages(images: [PreloadImageOptions]) async throws -> PreloadImagesResult {
    var succeeded: [String] = []
    var failed: [PreloadImageFailure] = []

    for imageOptions in images {
      do {
        try await downloadAndSaveImage(imageOptions)
        succeeded.append(imageOptions.key)
      } catch {
        failed.append(PreloadImageFailure(key: imageOptions.key, error: error.localizedDescription))
      }
    }

    return PreloadImagesResult(succeeded: succeeded, failed: failed)
  }

  func clearPreloadedImages(keys: [String]?) async {
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

  // MARK: - Widgets

  func updateWidget(widgetId: String, jsonString: String, options: UpdateWidgetOptions?) async throws {
    try writeWidgetData(widgetId: widgetId, jsonString: jsonString, deepLinkUrl: options?.deepLinkUrl)

    // Clear any scheduled timeline so single-entry data takes effect
    clearWidgetTimeline(widgetId: widgetId)

    // Reload the widget timeline
    WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
    print("[Voltra] Updated widget '\(widgetId)'")
  }

  func scheduleWidget(widgetId: String, timelineJson: String) async throws {
    try writeWidgetTimeline(widgetId: widgetId, timelineJson: timelineJson)

    // Reload the widget timeline to pick up scheduled entries
    WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
  }

  func reloadWidgets(widgetIds: [String]?) async {
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

  func clearWidget(widgetId: String) async {
    clearWidgetData(widgetId: widgetId)
    WidgetCenter.shared.reloadTimelines(ofKind: "Voltra_Widget_\(widgetId)")
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
            let prefix = "Voltra_Widget_"
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

  private func validatePayloadSize(_ compressedPayload: String, operation: String) throws {
    let dataSize = compressedPayload.utf8.count
    let safeBudget = 3345 // Keep existing safe budget
    print("Compressed payload size: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B)")

    if dataSize > safeBudget {
      throw VoltraModule.VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: operation == "start" ? -10 : -11,
          userInfo: [NSLocalizedDescriptionKey: "Compressed payload too large: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B). Reduce the UI before \(operation == "start" ? "starting" : "updating") the Live Activity."]
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

  private func downloadAndSaveImage(_ options: PreloadImageOptions) async throws {
    guard let url = URL(string: options.url) else {
      throw PreloadError.invalidURL(options.url)
    }

    var request = URLRequest(url: url)
    request.httpMethod = options.method ?? "GET"

    if let headers = options.headers {
      for (key, value) in headers {
        request.setValue(value, forHTTPHeaderField: key)
      }
    }

    let (data, response) = try await URLSession.shared.data(for: request)

    guard let httpResponse = response as? HTTPURLResponse else {
      throw PreloadError.invalidResponse
    }

    guard (200 ... 299).contains(httpResponse.statusCode) else {
      throw PreloadError.httpError(statusCode: httpResponse.statusCode)
    }

    if let contentLengthString = httpResponse.value(forHTTPHeaderField: "Content-Length"),
       let contentLength = Int(contentLengthString)
    {
      if contentLength >= MAX_PAYLOAD_SIZE_IN_BYTES {
        throw PreloadError.imageTooLarge(key: options.key, size: contentLength)
      }
    }

    if data.count >= MAX_PAYLOAD_SIZE_IN_BYTES {
      throw PreloadError.imageTooLarge(key: options.key, size: data.count)
    }

    guard UIImage(data: data) != nil else {
      throw PreloadError.invalidImageData(key: options.key)
    }

    try VoltraImageStore.saveImage(data, key: options.key)
    print("[Voltra] Preloaded image '\(options.key)' (\(data.count) bytes)")
  }

  private func writeWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) throws {
    guard let groupId = VoltraConfig.groupIdentifier() else {
      throw WidgetError.appGroupNotConfigured
    }
    guard let defaults = UserDefaults(suiteName: groupId) else {
      throw WidgetError.userDefaultsUnavailable
    }

    let dataSize = jsonString.utf8.count
    if dataSize > WIDGET_JSON_WARNING_SIZE {
      print("[Voltra] ⚠️ Large widget payload for '\(widgetId)': \(dataSize) bytes (warning threshold: \(WIDGET_JSON_WARNING_SIZE) bytes)")
    }

    defaults.set(jsonString, forKey: "Voltra_Widget_JSON_\(widgetId)")

    if let url = deepLinkUrl, !url.isEmpty {
      defaults.set(url, forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    } else {
      defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    }

    defaults.synchronize()
  }

  private func writeWidgetTimeline(widgetId: String, timelineJson: String) throws {
    guard let groupId = VoltraConfig.groupIdentifier() else {
      throw WidgetError.appGroupNotConfigured
    }
    guard let defaults = UserDefaults(suiteName: groupId) else {
      throw WidgetError.userDefaultsUnavailable
    }

    let dataSize = timelineJson.utf8.count
    if dataSize > TIMELINE_WARNING_SIZE {
      print("[Voltra] ⚠️ Large timeline for '\(widgetId)': \(dataSize) bytes (warning threshold: \(TIMELINE_WARNING_SIZE) bytes)")
    }

    defaults.set(timelineJson, forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
    print("[Voltra] writeWidgetTimeline: Timeline stored successfully")
  }

  private func clearWidgetData(widgetId: String) {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    defaults.removeObject(forKey: "Voltra_Widget_JSON_\(widgetId)")
    defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
    defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
  }

  private func clearAllWidgetData() {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    let widgetIds = Bundle.main.object(forInfoDictionaryKey: "Voltra_WidgetIds") as? [String] ?? []

    for widgetId in widgetIds {
      defaults.removeObject(forKey: "Voltra_Widget_JSON_\(widgetId)")
      defaults.removeObject(forKey: "Voltra_Widget_DeepLinkURL_\(widgetId)")
      defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    }
    defaults.synchronize()
  }

  private func clearWidgetTimeline(widgetId: String) {
    guard let groupId = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: groupId) else { return }

    defaults.removeObject(forKey: "Voltra_Widget_Timeline_\(widgetId)")
    defaults.synchronize()
  }

  private func cleanupOrphanedWidgetData() {
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
