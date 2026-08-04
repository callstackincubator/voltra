import Foundation
import os

/// A centralized event bus that manages Voltra events
/// - Persistent events (interactions): routed through UserDefaults for cross-process delivery
/// - Transient events (state changes, tokens): routed through NotificationCenter for in-process delivery
public class VoltraEventBus {
  public static let shared = VoltraEventBus()

  private var observer: NSObjectProtocol?
  private var renderFailureObserver: UUID?
  private var handler: ((String, [String: Any]) -> Void)?
  private var renderFailureListenerCount = 0
  private let lock = NSLock()

  private init() {}

  /// Send an event. Routing is automatic based on event type:
  /// - Persistent events → UserDefaults (survives app death, cross-process) + NotificationCenter (hot delivery)
  /// - Transient events → NotificationCenter only (in-memory, same process)
  public func send(_ event: VoltraEventType) {
    // Compute dictionary once to ensure consistent timestamp across all delivery paths
    let eventData = event.asDictionary

    if event.isPersistent {
      // Persistent: write to UserDefaults first (for widget → app communication, survives app death)
      VoltraPersistentEventQueue.write(eventData)
    }

    // Always post to NotificationCenter for immediate delivery when app is running
    NotificationCenter.default.post(
      name: .voltraEvent,
      object: nil,
      userInfo: eventData
    )
  }

  /// Subscribe to Voltra events. This will:
  /// 1. Replay any persisted events from UserDefaults (cold start)
  /// 2. Set up a NotificationCenter observer for all events (hot delivery)
  ///
  /// - Parameter handler: A closure that receives the event name and event data dictionary
  public func subscribe(handler: @escaping (String, [String: Any]) -> Void) {
    lock.lock()
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
    if let renderFailureObserver {
      VoltraDynamicLiveActivityRenderFailureReporter.removeChangeObserver(renderFailureObserver)
      self.renderFailureObserver = nil
    }
    self.handler = handler

    // 1. Replay persisted events from UserDefaults (interactions from widget)
    let persistedEvents = VoltraPersistentEventQueue.popAll()
    // 2. Listen for all events via NotificationCenter (hot delivery)
    observer = NotificationCenter.default.addObserver(
      forName: .voltraEvent,
      object: nil,
      queue: .main
    ) { notification in
      guard let userInfo = notification.userInfo as? [String: Any],
            let eventName = userInfo["type"] as? String
      else {
        return
      }
      handler(eventName, userInfo)
    }
    renderFailureObserver = VoltraDynamicLiveActivityRenderFailureReporter.observeChanges { [weak self] in
      self?.drainDynamicLiveActivityRenderFailures()
    }
    lock.unlock()

    for event in persistedEvents {
      handler(event.name, event.data)
    }
    VoltraLogger.event.info("Replayed \(persistedEvents.count) persisted events")
  }

  /// JS owns the dedicated emitter subscription count. Persisted failures must
  /// remain queued whenever there is no relevant JavaScript listener.
  public func setDynamicLiveActivityRenderFailureListenerActive(_ active: Bool) {
    lock.lock()
    renderFailureListenerCount = active ? 1 : 0
    lock.unlock()
    if active { drainDynamicLiveActivityRenderFailures() }
  }

  /// Flush only the dedicated Dynamic Live Activity diagnostic queue. This
  /// cannot read, displace, or clear persistent interaction events.
  public func drainDynamicLiveActivityRenderFailures() {
    lock.lock()
    let handler = handler
    let isReady = renderFailureListenerCount > 0
    lock.unlock()
    guard isReady, let handler else { return }

    let failures = VoltraDynamicLiveActivityRenderFailureReporter.drain()
    for failure in failures {
      handler(failure.type, failure.dictionary)
    }
    if !failures.isEmpty {
      VoltraLogger.event.info("Replayed \(failures.count) Dynamic Live Activity render failures")
    }
  }

  /// Unsubscribe from Voltra events
  public func unsubscribe() {
    lock.lock()
    defer { lock.unlock() }

    if let observer = observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
    if let renderFailureObserver {
      VoltraDynamicLiveActivityRenderFailureReporter.removeChangeObserver(renderFailureObserver)
      self.renderFailureObserver = nil
    }
    handler = nil
    renderFailureListenerCount = 0
  }

  deinit {
    unsubscribe()
  }
}
