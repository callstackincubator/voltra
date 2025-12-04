import Foundation

extension Notification.Name {
    static let voltraEvent = Notification.Name("voltraEvent")
}

public struct VoltraEvent {
    public let type: String
    public let data: [String: Any]
    
    public init(type: String, data: [String: Any]) {
        self.type = type
        self.data = data
    }
    
    // Convenience initializer to reconstruct from a dictionary (e.g., from Notification userInfo)
    public init?(from dictionary: [String: Any]) {
        guard let type = dictionary["type"] as? String else {
            return nil
        }
        var data = dictionary
        data.removeValue(forKey: "type")
        self.type = type
        self.data = data
    }
    
    public var asDictionary: [String: Any] {
        var dict = data
        dict["type"] = type
        return dict
    }
}

// A thread-safe singleton to hold events temporarily
public class VoltraEventBuffer {
    static let shared = VoltraEventBuffer()
    
    private var events: [VoltraEvent] = []
    private let lock = NSLock()
    
    // Called by the Intent (Background Thread)
    func append(event: VoltraEvent) {
        lock.lock()
        defer { lock.unlock() }
        events.append(event)
    }
    
    // Called by Expo Module (Main Thread)
    func popAll() -> [VoltraEvent] {
        lock.lock()
        defer { lock.unlock() }
        let pending = events
        events.removeAll()
        return pending
    }
}
