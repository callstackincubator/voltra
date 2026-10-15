import Foundation
import os

/// A centralized event bus that manages Voltra events
/// - Interactions: always recorded in the App Group interaction queue. The bus only signals that
///   taps are available; JavaScript takes them with `popInteractions` (ADR 0011).
/// - Transient events (state changes, tokens, enablement): routed through NotificationCenter for
///   in-process delivery only. Their current values are readable through getters instead.
public class VoltraEventBus {
  public static let shared = VoltraEventBus()

  /// Emitted to JavaScript, without data, whenever a tap is recorded in any process.
  public static let interactionsAvailableEventName = "interactionsAvailable"

  private var observer: NSObjectProtocol?
  private var renderFailureObserver: UUID?
  private var interactionObserver: UUID?
  private var handler: ((String, [String: Any]) -> Void)?
  private var renderFailureListenerCount = 0
  /// Identifies the current subscription, so a module instance torn down after its replacement
  /// subscribed (e.g. during a reload) cannot remove the replacement's handler.
  private var subscription: UUID?
  private let lock = NSLock()

  private init() {}

  /// Send an event. Routing is automatic based on event type:
  /// - Interactions → the App Group queue, then an availability signal to every process
  /// - Transient events → NotificationCenter only (in-memory, same process)
  public func send(_ event: VoltraEventType) {
    if case let .interaction(source, identifier, payload) = event {
      VoltraInteractionReporter.record(VoltraInteraction(source: source, identifier: identifier, payload: payload))
      return
    }

    NotificationCenter.default.post(
      name: .voltraEvent,
      object: nil,
      userInfo: event.asDictionary
    )
  }

  /// Install the handler that forwards events to JavaScript.
  ///
  /// Nothing is replayed here: queued interactions stay queued until JavaScript pops them.
  ///
  /// - Parameter handler: A closure that receives the event name and event data dictionary
  /// - Returns: a token to pass to `unsubscribe`
  @discardableResult
  public func subscribe(handler: @escaping (String, [String: Any]) -> Void) -> UUID {
    VoltraInteractionReporter.discardLegacyQueue()

    let token = UUID()
    lock.lock()
    removeObserversLocked()
    self.handler = handler
    subscription = token

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
    interactionObserver = VoltraInteractionReporter.observeChanges {
      handler(Self.interactionsAvailableEventName, ["type": Self.interactionsAvailableEventName])
    }
    lock.unlock()
    return token
  }

  /// Remove and return queued taps, oldest first, as JavaScript event dictionaries. With
  /// `sources`, only taps from those sources are taken.
  public func popInteractions(sources: Set<String>?) -> [[String: Any]] {
    let interactions = VoltraInteractionReporter.pop(sources: sources)
    if !interactions.isEmpty {
      VoltraLogger.event.info("Handed \(interactions.count) interactions to JavaScript")
    }
    return interactions.map(\.dictionary)
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

  /// Unsubscribe from Voltra events. A token from an earlier `subscribe` that has since been
  /// replaced is ignored.
  public func unsubscribe(_ token: UUID? = nil) {
    lock.lock()
    defer { lock.unlock() }

    if let token, token != subscription {
      return
    }
    subscription = nil
    removeObserversLocked()
    handler = nil
    renderFailureListenerCount = 0
  }

  private func removeObserversLocked() {
    if let observer {
      NotificationCenter.default.removeObserver(observer)
      self.observer = nil
    }
    if let renderFailureObserver {
      VoltraDynamicLiveActivityRenderFailureReporter.removeChangeObserver(renderFailureObserver)
      self.renderFailureObserver = nil
    }
    if let interactionObserver {
      VoltraInteractionReporter.removeChangeObserver(interactionObserver)
      self.interactionObserver = nil
    }
  }

  deinit {
    unsubscribe()
  }
}
