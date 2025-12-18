import Foundation

/// Persistent event queue for events that must survive app death (e.g., interactions from widget)
/// Uses UserDefaults with App Group for cross-process communication
public struct VoltraPersistentEventQueue {
    private static let queueKey = "Voltra_EventsQueue"
    
    static func groupIdentifier() -> String? {
        Bundle.main.object(forInfoDictionaryKey: "Voltra_AppGroupIdentifier") as? String
    }
    
    /// Write an event to the persistent queue (UserDefaults)
    static func write(_ event: VoltraEventType) {
        let payload = event.asDictionary
        
        guard let group = groupIdentifier(),
              let defaults = UserDefaults(suiteName: group),
              JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload, options: [])
        else {
            print("[VoltraPersistentEventQueue] Failed to write event - no group identifier or invalid payload")
            return
        }
        
        let jsonString = String(data: data, encoding: .utf8) ?? "{}"
        
        var queue = defaults.array(forKey: queueKey) as? [String] ?? []
        queue.append(jsonString)
        defaults.set(queue, forKey: queueKey)
        defaults.synchronize()
        
        print("[VoltraPersistentEventQueue] Wrote event: \(event.name)")
    }
    
    /// Read all events from the persistent queue and clear it
    /// Returns an array of (eventName, eventData) tuples
    static func popAll() -> [(name: String, data: [String: Any])] {
        guard let group = groupIdentifier() else {
            print("[VoltraPersistentEventQueue] popAll: No group identifier found")
            return []
        }
        guard let defaults = UserDefaults(suiteName: group) else {
            print("[VoltraPersistentEventQueue] popAll: Could not access UserDefaults for group: \(group)")
            return []
        }
        
        let queue = defaults.array(forKey: queueKey) as? [String] ?? []
        let eventCount = queue.count
        print("[VoltraPersistentEventQueue] popAll: Found \(eventCount) events in queue")
        
        // Clear the queue first
        defaults.set([String](), forKey: queueKey)
        defaults.synchronize()
        
        // Skip processing if queue is excessively large (stale data)
        if eventCount > 1000 {
            print("[VoltraPersistentEventQueue] popAll: Skipping processing of \(eventCount) stale events")
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
