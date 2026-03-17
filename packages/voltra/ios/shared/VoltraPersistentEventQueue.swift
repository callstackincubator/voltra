import Foundation
import os

/// Persistent event queue for events that must survive app death (e.g., interactions from widget)
/// Uses UserDefaults with App Group for cross-process communication
public enum VoltraPersistentEventQueue {
  private static let queueKey = "Voltra_EventsQueue"

  /// Write an event to the persistent queue (UserDefaults)
  static func write(_ payload: [String: Any]) {
    guard let group = VoltraConfig.groupIdentifier(),
          let defaults = UserDefaults(suiteName: group),
          JSONSerialization.isValidJSONObject(payload),
          let data = try? JSONSerialization.data(withJSONObject: payload, options: [])
    else {
      VoltraLogger.event.error("Failed to write event — no group identifier or invalid payload")
      return
    }

    let jsonString = String(data: data, encoding: .utf8) ?? "{}"

    var queue = defaults.array(forKey: queueKey) as? [String] ?? []
    queue.append(jsonString)
    defaults.set(queue, forKey: queueKey)
    defaults.synchronize()

    let eventName = payload["type"] as? String ?? "unknown"
    VoltraLogger.event.debug("Wrote event: \(eventName)")
  }

  /// Read all events from the persistent queue and clear it
  /// Returns an array of (eventName, eventData) tuples
  static func popAll() -> [(name: String, data: [String: Any])] {
    guard let group = VoltraConfig.groupIdentifier() else {
      VoltraLogger.event.error("popAll: No group identifier found")
      return []
    }
    guard let defaults = UserDefaults(suiteName: group) else {
      VoltraLogger.event.error("popAll: Could not access UserDefaults for group '\(group)'")
      return []
    }

    let queue = defaults.array(forKey: queueKey) as? [String] ?? []
    let eventCount = queue.count
    VoltraLogger.event.debug("popAll: Found \(eventCount) events in queue")

    // Clear the queue first
    defaults.set([String](), forKey: queueKey)
    defaults.synchronize()

    // Skip processing if queue is excessively large (stale data)
    if eventCount > 1000 {
      VoltraLogger.event.warning("popAll: Skipping \(eventCount) stale events")
      return []
    }

    // Parse JSON strings into event tuples
    return queue.compactMap { jsonString -> (name: String, data: [String: Any])? in
      guard let data = jsonString.data(using: .utf8),
            let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let eventName = dict["type"] as? String
      else { return nil }

      return (name: eventName, data: dict)
    }
  }
}
