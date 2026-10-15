import Foundation
import os

/// A centralized event bus that manages Voltra events
/// - Persistent events (interactions): delivered hot while JavaScript listens, otherwise held in
///   UserDefaults (App Group) until a listener attaches. See ADR 0011.
/// - Transient events (state changes, tokens, enablement): routed through NotificationCenter for
///   in-process delivery only. Their current values are readable through getters instead.
public class VoltraEventBus {
  public static let shared = VoltraEventBus()

  private var observer: NSObjectProtocol?
  private var renderFailureObserver: UUID?
  private var handler: ((String, [String: Any]) -> Void)?
  private var renderFailureListenerCount = 0
  private var interactionListenerActive = false
  private let lock = NSLock()

  private init() {}

  /// Send an event. Routing is automatic based on event type:
  /// - Persistent events → hot delivery when a JavaScript listener is attached in this process,
  ///   otherwise UserDefaults only (survives app death, cross-process). Never both, so a delivered
  ///   event is not replayed later.
  /// - Transient events → NotificationCenter only (in-memory, same process)
  public func send(_ event: VoltraEventType) {
    // Compute dictionary once to ensure consistent timestamp across all delivery paths
    let eventData = event.asDictionary

    if event.isPersistent {
      lock.lock()
      let deliverHot = interactionListenerActive && handler != nil
      if !deliverHot {
        // Written under the lock so a concurrent drain cannot clear the queue between the
        // listener check and the write.
        VoltraPersistentEventQueue.write(eventData)
      }
      lock.unlock()

      guard deliverHot else { return }
    }

    NotificationCenter.default.post(
      name: .voltraEvent,
      object: nil,
      userInfo: eventData
    )
  }

  /// Install the handler that forwards events to JavaScript and start listening for hot delivery.
  ///
  /// Persisted interactions are not replayed here: at module creation no JavaScript listener is
  /// attached yet. They are drained by `setInteractionListenerActive(true)`.
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
  }

  /// JS owns the `interaction` subscription count, because codegen emitters do not tell native
  /// code when a listener is added or removed. While active, interactions are delivered hot and
  /// never persisted; while inactive, they are persisted and wait for the next activation.
  public func setInteractionListenerActive(_ active: Bool) {
    lock.lock()
    interactionListenerActive = active
    lock.unlock()
    if active {
      drainInteractions()
    }
  }

  /// Deliver every persisted interaction to JavaScript, but only while a listener is attached.
  /// Entries leave the queue in the same step that hands them to the handler.
  public func drainInteractions() {
    lock.lock()
    guard interactionListenerActive, let handler else {
      lock.unlock()
      return
    }
    let persistedEvents = VoltraPersistentEventQueue.popAll()
    lock.unlock()

    for event in persistedEvents {
      handler(event.name, event.data)
    }
    if !persistedEvents.isEmpty {
      VoltraLogger.event.info("Delivered \(persistedEvents.count) persisted interactions")
    }
  }

  /// JS owns the dedicated emitter subscription count. Persisted failures must
  /// remain queued whenever there is no relevant JavaScript listener.
  public func setDynamicLiveActivityRenderFailureListenerActive(_ active: Bool) {
    lock.lock()
    renderFailureListenerCount = active ? 1 : 0
    lock.unlock()
    if active {
      drainDynamicLiveActivityRenderFailures()
    }
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
    interactionListenerActive = false
  }

  deinit {
    unsubscribe()
  }
}
