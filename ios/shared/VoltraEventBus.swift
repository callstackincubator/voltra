import Foundation

/// A centralized event bus that manages Voltra events from both the buffer (cold start) and NotificationCenter (hot events)
public class VoltraEventBus {
    public static let shared = VoltraEventBus()
    
    private var observer: NSObjectProtocol?
    private let lock = NSLock()
    
    private init() {}
    
    /// Subscribe to Voltra events. This will:
    /// 1. Process any buffered events that occurred while the app was not observing
    /// 2. Set up a NotificationCenter observer for new events
    ///
    /// - Parameter handler: A closure that receives the event type and event data dictionary
    public func subscribe(handler: @escaping (String, [String: Any]) -> Void) {
        lock.lock()
        defer { lock.unlock() }
        
        // A. Handle Cold Start / Background Wake-up
        // Check the mailbox for events that happened while JS was loading
        let pendingEvents = VoltraEventBuffer.shared.popAll()
        for event in pendingEvents {
            handler(event.type, event.asDictionary)
        }
        
        // B. Handle Hot Events
        // Listen for new events happening while the app is alive
        observer = NotificationCenter.default.addObserver(
            forName: .voltraEvent,
            object: nil,
            queue: .main
        ) { notification in
            // Extract VoltraEvent from userInfo
            guard let userInfo = notification.userInfo as? [String: Any],
                  let event = VoltraEvent(from: userInfo) else {
                return
            }
            
            handler(event.type, event.asDictionary)
        }
    }
    
    /// Unsubscribe from Voltra events by removing the NotificationCenter observer
    public func unsubscribe() {
        lock.lock()
        defer { lock.unlock() }
        
        if let observer = observer {
            NotificationCenter.default.removeObserver(observer)
            self.observer = nil
        }
    }
    
    /// Send a Voltra event. This will:
    /// 1. Append the event to the buffer (for cold start scenarios)
    /// 2. Post the event to NotificationCenter (for hot events when app is running)
    ///
    /// - Parameters:
    ///   - type: The event type (e.g., "interaction")
    ///   - data: The event data dictionary
    public func sendEvent(type: String, data: [String: Any]) {
        let event = VoltraEvent(type: type, data: data)
        
        // 1. Always write to the Buffer (The Mailbox)
        // We do this first to ensure no race condition if the app is waking up
        VoltraEventBuffer.shared.append(event: event)
        
        // 2. Notify the system immediately
        // (In case the app is ALREADY running and listening)
        NotificationCenter.default.post(
            name: .voltraEvent,
            object: nil,
            userInfo: event.asDictionary
        )
    }
    
    deinit {
        unsubscribe()
    }
}

