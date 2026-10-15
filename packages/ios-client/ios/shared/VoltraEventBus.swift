import Foundation
import os

/// A centralized event bus that manages Voltra events
/// - Interactions: always recorded in the interaction queue. The bus only signals that taps are
///   available; JavaScript takes them with `popInteractions` (ADR 0011).
/// - Transient events (state changes, tokens, enablement): routed through NotificationCenter for
///   in-process delivery only. Their current values are readable through getters instead.
///
/// Every React Native instance's module subscribes with its own token, so instances never replace
/// or tear down each other's handler.
public class VoltraEventBus {
  public static let shared = VoltraEventBus()

  /// Emitted to JavaScript, without tap data, whenever a tap is recorded in any process.
  public static let interactionsAvailableEventName = "interactionsAvailable"

  public typealias Handler = (String, [String: Any]) -> Void

  private var observer: NSObjectProtocol?
  private var renderFailureObserver: UUID?
  private var interactionObserver: UUID?
  private var handlers: [UUID: Handler] = [:]
  /// Subscriptions whose JavaScript has a `dynamicLiveActivityRenderFailed` listener.
  private var renderFailureListeners: Set<UUID> = []
  private let lock = NSLock()

  private init() {}

  /// Send an event. Routing is automatic based on event type:
  /// - Interactions → the interaction queue, then an availability signal to every process
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

  /// Add a handler that forwards events to one JavaScript instance.
  ///
  /// Nothing is replayed here: queued interactions stay queued until JavaScript pops them.
  ///
  /// - Returns: the token that identifies this subscription in `unsubscribe` and
  ///   `setDynamicLiveActivityRenderFailureListenerActive`
  @discardableResult
  public func subscribe(handler: @escaping Handler) -> UUID {
    VoltraInteractionReporter.discardLegacyQueue()

    let token = UUID()
    lock.lock()
    handlers[token] = handler
    if handlers.count == 1 {
      installObserversLocked()
    }
    lock.unlock()
    return token
  }

  /// Remove one subscription, or every subscription when `token` is nil.
  public func unsubscribe(_ token: UUID? = nil) {
    lock.lock()
    defer { lock.unlock() }

    if let token {
      handlers.removeValue(forKey: token)
      renderFailureListeners.remove(token)
    } else {
      handlers.removeAll()
      renderFailureListeners.removeAll()
    }
    if handlers.isEmpty {
      removeObserversLocked()
    }
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

  /// Put back taps JavaScript took but had no listener for by the time it dispatched them.
  public func restoreInteractions(_ dictionaries: [[String: Any]]) {
    let interactions = dictionaries.compactMap(VoltraInteraction.init(dictionary:))
    VoltraInteractionReporter.restore(interactions)
    if !interactions.isEmpty {
      VoltraLogger.event.info("Restored \(interactions.count) undispatched interactions")
    }
  }

  /// JS owns the dedicated emitter subscription count. Persisted failures must
  /// remain queued whenever there is no relevant JavaScript listener.
  public func setDynamicLiveActivityRenderFailureListenerActive(_ active: Bool, for token: UUID) {
    lock.lock()
    if active, handlers[token] != nil {
      renderFailureListeners.insert(token)
    } else {
      renderFailureListeners.remove(token)
    }
    lock.unlock()
    if active {
      drainDynamicLiveActivityRenderFailures()
    }
  }

  /// Flush only the dedicated Dynamic Live Activity diagnostic queue, to every JavaScript instance
  /// with a listener. This cannot read, displace, or clear persistent interaction events.
  public func drainDynamicLiveActivityRenderFailures() {
    lock.lock()
    let targets = renderFailureListeners.compactMap { handlers[$0] }
    lock.unlock()
    guard !targets.isEmpty else { return }

    let failures = VoltraDynamicLiveActivityRenderFailureReporter.drain()
    for failure in failures {
      targets.forEach { $0(failure.type, failure.dictionary) }
    }
    if !failures.isEmpty {
      VoltraLogger.event.info("Replayed \(failures.count) Dynamic Live Activity render failures")
    }
  }

  private func forEachHandler(_ body: (Handler) -> Void) {
    lock.lock()
    let current = Array(handlers.values)
    lock.unlock()
    current.forEach(body)
  }

  private func installObserversLocked() {
    observer = NotificationCenter.default.addObserver(
      forName: .voltraEvent,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      guard let userInfo = notification.userInfo as? [String: Any],
            let eventName = userInfo["type"] as? String
      else {
        return
      }
      self?.forEachHandler { $0(eventName, userInfo) }
    }
    renderFailureObserver = VoltraDynamicLiveActivityRenderFailureReporter.observeChanges { [weak self] in
      self?.drainDynamicLiveActivityRenderFailures()
    }
    interactionObserver = VoltraInteractionReporter.observeChanges { [weak self] in
      self?.forEachHandler {
        $0(Self.interactionsAvailableEventName, ["type": Self.interactionsAvailableEventName])
      }
    }
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
