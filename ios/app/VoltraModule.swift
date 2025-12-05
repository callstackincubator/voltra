import ActivityKit
import ExpoModulesCore
import Foundation
import WidgetKit

public class VoltraModule: Module {
  private let STATIC_WIDGET_SYNTHETIC_ID = "widget"
  private let DEFAULT_WIDGET_KEY = "1"
  // Legacy keys retained for backward compatibility if needed
  private let WIDGET_JSON_KEY = "Voltra_Widget_JSON"
  private let WIDGET_DEEPLINK_URL_KEY = "Voltra_Widget_DeepLinkURL"
  private let MAX_PAYLOAD_SIZE_IN_BYTES = 4096
  private let liveActivityService = VoltraLiveActivityService()
  
  enum VoltraErrors: Error {
    case unsupportedOS
    case notFound
    case liveActivitiesNotEnabled
    case unexpectedError(Error)
  }

  private func validatePayloadSize(_ jsonString: String, operation: String) throws {
    let dataSize = jsonString.utf8.count
    let safeBudget = 3345  // Keep existing safe budget
    print("Payload size: \(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B)")

    if dataSize > safeBudget {
      throw VoltraErrors.unexpectedError(
        NSError(
          domain: "VoltraModule",
          code: operation == "start" ? -10 : -11,
          userInfo: [NSLocalizedDescriptionKey: "Payload too large: JSON=\(dataSize)B (safe budget \(safeBudget)B, hard cap \(MAX_PAYLOAD_SIZE_IN_BYTES)B). Reduce the UI before \(operation == "start" ? "starting" : "updating") the Live Activity."]
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
    }

    OnStopObserving {
      VoltraEventBus.shared.unsubscribe()
    }

    OnCreate {
      // Observe ActivityKit streams for tokens and state changes
      if pushNotificationsEnabled {
        observePushToStartToken()
      }
      observeLiveActivityUpdates()
    }

    AsyncFunction("startVoltra") { (jsonString: String, options: StartVoltraOptions?) async throws -> String in
      // Route to static widget if requested
      let target = options?.target ?? "liveActivity"
      if target == "widget" {
        // Select widget key (arbitrary string). Default to "1" for backward compatibility.
        let key = (options?.widgetKey?.trimmingCharacters(in: .whitespacesAndNewlines)).flatMap { $0.isEmpty ? nil : $0 } ?? DEFAULT_WIDGET_KEY
        // Write JSON into App Group so the Widget extension can render it
        let payloadBytes = jsonString.lengthOfBytes(using: .utf8)
        guard writeWidgetJsonString(jsonString, suffix: key) else {
          throw VoltraErrors.unexpectedError(
            NSError(
              domain: "VoltraModule",
              code: -100,
              userInfo: [NSLocalizedDescriptionKey: "App Group not configured: set 'groupIdentifier' in the config plugin so the app and widget extension share storage."]
            )
          )
        }
        if let dl = options?.deepLinkUrl, !dl.isEmpty {
          _ = writeWidgetDeepLinkUrl(dl, suffix: key)
        }
        if #available(iOS 14.0, *) {
          WidgetCenter.shared.reloadTimelines(ofKind: "VoltraStaticWidget")
          WidgetCenter.shared.reloadAllTimelines()
        }
        print("[Voltra][Widget] start key=\(key) bytes=\(payloadBytes)")
        return "\(STATIC_WIDGET_SYNTHETIC_ID):\(key)"
      }

      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      guard VoltraLiveActivityService.areActivitiesEnabled() else { 
        throw VoltraErrors.liveActivitiesNotEnabled 
      }

      do {
        try validatePayloadSize(jsonString, operation: "start")

        let activityName = options?.activityId?.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // Extract staleDate and relevanceScore from options
        let staleDate: Date? = {
          if let staleDateMs = options?.staleDate {
            return Date(timeIntervalSince1970: staleDateMs / 1000.0)
          }
          return nil
        }()
        let relevanceScore: Double = options?.relevanceScore ?? 0.0

        // Create request struct
        let createRequest = CreateActivityRequest(
          activityId: activityName,
          deepLinkUrl: options?.deepLinkUrl,
          jsonString: jsonString,
          staleDate: staleDate,
          relevanceScore: relevanceScore,
          pushType: pushNotificationsEnabled ? .token : nil,
          endExistingWithSameName: true
        )

        // Create activity using service
        let finalActivityId = try await liveActivityService.createActivity(createRequest)

        // Best-effort local auto-end scheduling (app must be alive)
        if let autoEndAt = options?.autoEndAt {
          let endDate = Date(timeIntervalSince1970: autoEndAt / 1000.0)
          let delay = max(0, endDate.timeIntervalSinceNow)
          if delay > 0 {
            Task.detached { [activityId = finalActivityId] in
              do {
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
              } catch {}
                try? await self.liveActivityService.endActivity(byName: activityId)
            }
          } else {
            // If autoEndAt is in the past, end immediately
            try await liveActivityService.endActivity(byName: finalActivityId)
          }
        }

        return finalActivityId
      } catch let error {
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

    AsyncFunction("updateVoltra") { (activityId: String, jsonString: String, options: UpdateVoltraOptions?) async throws in
      // Static Widget path
      if activityId.hasPrefix(STATIC_WIDGET_SYNTHETIC_ID) {
        guard let key = parseWidgetKey(from: activityId) else {
          throw VoltraErrors.unexpectedError(
            NSError(
              domain: "VoltraModule",
              code: -102,
              userInfo: [NSLocalizedDescriptionKey: "Invalid widget identifier \(activityId). Pass IDs in the format 'widget:<your-id>'."]
            )
          )
        }
        let payloadBytes = jsonString.lengthOfBytes(using: .utf8)
        guard writeWidgetJsonString(jsonString, suffix: key) else {
          throw VoltraErrors.unexpectedError(
            NSError(
              domain: "VoltraModule",
              code: -101,
              userInfo: [NSLocalizedDescriptionKey: "App Group not configured: set 'groupIdentifier' in the config plugin so the app and widget extension share storage."]
            )
          )
        }
        if #available(iOS 14.0, *) {
          WidgetCenter.shared.reloadTimelines(ofKind: "VoltraStaticWidget")
          WidgetCenter.shared.reloadAllTimelines()
        }
        print("[Voltra][Widget] update key=\(key) bytes=\(payloadBytes)")
        return
      }

      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      
      try validatePayloadSize(jsonString, operation: "update")

      // Extract staleDate and relevanceScore from options
      let staleDate: Date? = {
        if let staleDateMs = options?.staleDate {
          return Date(timeIntervalSince1970: staleDateMs / 1000.0)
        }
        return nil
      }()
      let relevanceScore: Double = options?.relevanceScore ?? 0.0

      // Create update request struct
      let updateRequest = UpdateActivityRequest(
        jsonString: jsonString,
        staleDate: staleDate,
        relevanceScore: relevanceScore
      )

      do {
        try await liveActivityService.updateActivity(byName: activityId, request: updateRequest)
      } catch let error {
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

    AsyncFunction("endVoltra") { (activityId: String) async throws in
      // Static Widget path
      if activityId.hasPrefix(STATIC_WIDGET_SYNTHETIC_ID) {
        guard let key = parseWidgetKey(from: activityId) else {
          throw VoltraErrors.unexpectedError(
            NSError(
              domain: "VoltraModule",
              code: -103,
              userInfo: [NSLocalizedDescriptionKey: "Invalid widget identifier \(activityId). Pass IDs in the format 'widget:<your-id>'."]
            )
          )
        }
        clearWidgetJson(suffix: key)
        clearWidgetDeepLinkUrl(suffix: key)
        if #available(iOS 14.0, *) {
          WidgetCenter.shared.reloadTimelines(ofKind: "VoltraStaticWidget")
          WidgetCenter.shared.reloadAllTimelines()
        }
        print("[Voltra][Widget] cleared key=\(key)")
        return
      }

      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      
      do {
        try await liveActivityService.endActivity(byName: activityId)
      } catch let error {
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

    // End all running Live Activities created by this module
    AsyncFunction("endAllVoltra") { () async throws in
      guard #available(iOS 16.2, *) else { throw VoltraErrors.unsupportedOS }
      await liveActivityService.endAllActivities()
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
      return liveActivityService.getAllActivities().map { $0.id }
    }

    Function("isVoltraActive") { (activityId: String) -> Bool in
      guard #available(iOS 16.2, *) else { return false }
      return liveActivityService.isActivityActive(name: activityId)
    }
  }

}

// MARK: - Static Widget JSON store

private extension VoltraModule {
  func appGroupIdentifier() -> String? {
    Bundle.main.object(forInfoDictionaryKey: "Voltra_AppGroupIdentifier") as? String
  }

  @discardableResult
  func writeWidgetJsonString(_ json: String) -> Bool {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return false }
    defaults.set(json, forKey: WIDGET_JSON_KEY)
    defaults.synchronize()
    return true
  }

  func clearWidgetJson() {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return }
    defaults.removeObject(forKey: WIDGET_JSON_KEY)
    defaults.synchronize()
  }

  // New suffixed variants (slots 1/2/3)
  @discardableResult
  func writeWidgetJsonString(_ json: String, suffix: String) -> Bool {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return false }
    defaults.set(json, forKey: "\(WIDGET_JSON_KEY)_\(suffix)")
    defaults.synchronize()
    return true
  }

  func clearWidgetJson(suffix: String) {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return }
    defaults.removeObject(forKey: "\(WIDGET_JSON_KEY)_\(suffix)")
    defaults.synchronize()
  }

  // Store a deep link URL used by the static widget when tapped
  @discardableResult
  func writeWidgetDeepLinkUrl(_ url: String) -> Bool {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return false }
    defaults.set(url, forKey: WIDGET_DEEPLINK_URL_KEY)
    defaults.synchronize()
    return true
  }

  func clearWidgetDeepLinkUrl() {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return }
    defaults.removeObject(forKey: WIDGET_DEEPLINK_URL_KEY)
    defaults.synchronize()
  }

  // New suffixed variants (slots 1/2/3)
  @discardableResult
  func writeWidgetDeepLinkUrl(_ url: String, suffix: String) -> Bool {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return false }
    defaults.set(url, forKey: "\(WIDGET_DEEPLINK_URL_KEY)_\(suffix)")
    defaults.synchronize()
    return true
  }

  func clearWidgetDeepLinkUrl(suffix: String) {
    guard let group = appGroupIdentifier(), let defaults = UserDefaults(suiteName: group) else { return }
    defaults.removeObject(forKey: "\(WIDGET_DEEPLINK_URL_KEY)_\(suffix)")
    defaults.synchronize()
  }

  // Parse synthetic widget id "widget:<key>" -> "<key>"
  func parseWidgetKey(from activityId: String) -> String? {
    let parts = activityId.split(separator: ":", maxSplits: 1).map(String.init)
    guard parts.count == 2, parts[0] == STATIC_WIDGET_SYNTHETIC_ID else { return nil }
    let key = parts[1]
    return key.isEmpty ? nil : key
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
    Task {
      for await data in Activity<VoltraAttributes>.pushToStartTokenUpdates {
        let token = data.reduce("") { $0 + String(format: "%02x", $1) }
        sendEvent("activityPushToStartTokenReceived", [
          "source": "pushToStartToken",
          "activityPushToStartToken": token,
        ])
      }
    }
  }

  func observeLiveActivityUpdates() {
    guard #available(iOS 16.2, *) else { return }
    Task {
      for await activityUpdate in Activity<VoltraAttributes>.activityUpdates {
        let activityId = activityUpdate.id
        let activityState = activityUpdate.activityState

        guard
          let activity = Activity<VoltraAttributes>.activities.first(where: { $0.id == activityId })
        else { continue }

        if case .active = activityState {
          // Emit an immediate event so JS can learn about newly-active activities (e.g., push-to-start)
          sendEvent("stateChange", [
            "source": activity.id,
            "timestamp": Date().timeIntervalSince1970,
            "activityID": activity.id,
            "activityName": activity.attributes.name,
            "activityState": String(describing: activityState),
          ])

          // Forward state changes
          Task {
            for await state in activity.activityStateUpdates {
              sendEvent("stateChange", [
                "source": activity.id,
                "timestamp": Date().timeIntervalSince1970,
                "activityID": activity.id,
                "activityName": activity.attributes.name,
                "activityState": String(describing: state),
              ])
            }
          }

          // Forward push token updates if enabled
          if pushNotificationsEnabled {
            Task {
              for await pushToken in activity.pushTokenUpdates {
                let pushTokenString = pushToken.reduce("") { $0 + String(format: "%02x", $1) }
                sendEvent("activityTokenReceived", [
                  "source": activity.id,
                  "timestamp": Date().timeIntervalSince1970,
                  "activityID": activity.id,
                  "activityName": activity.attributes.name,
                  "activityPushToken": pushTokenString,
                ])
              }
            }
          }
        }
      }
    }
  }
}
