import CoreFoundation
import Foundation

/// Cross-process notification relay for the App Group backed failure queue.
/// Darwin notifications carry no payload, so consumers always drain storage.
private final class VoltraDynamicLiveActivityRenderFailureNotifier {
  static let shared = VoltraDynamicLiveActivityRenderFailureNotifier()

  private let lock = NSLock()
  private var handlers: [UUID: () -> Void] = [:]
  private let name = "com.voltra.dynamicLiveActivityRenderFailures" as CFString

  private init() {
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      Self.didReceive,
      name,
      nil,
      .deliverImmediately
    )
  }

  deinit {
    CFNotificationCenterRemoveObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      CFNotificationName(name),
      nil
    )
  }

  func add(_ handler: @escaping () -> Void) -> UUID {
    let token = UUID()
    lock.lock()
    handlers[token] = handler
    lock.unlock()
    return token
  }

  func remove(_ token: UUID) {
    lock.lock()
    handlers.removeValue(forKey: token)
    lock.unlock()
  }

  func post() {
    notifyHandlers()
    CFNotificationCenterPostNotification(
      CFNotificationCenterGetDarwinNotifyCenter(),
      CFNotificationName(name),
      nil,
      nil,
      true
    )
  }

  private static let didReceive: CFNotificationCallback = { _, observer, _, _, _ in
    guard let observer else { return }
    Unmanaged<VoltraDynamicLiveActivityRenderFailureNotifier>
      .fromOpaque(observer)
      .takeUnretainedValue()
      .notifyHandlers()
  }

  private func notifyHandlers() {
    lock.lock()
    let currentHandlers = Array(handlers.values)
    lock.unlock()
    currentHandlers.forEach { $0() }
  }
}

/// Owns the production App Group queue and OS logging path. The extension only
/// records failures; the app's event bus drains them when JavaScript can listen.
public enum VoltraDynamicLiveActivityRenderFailureReporter {
  private static var queue: VoltraDynamicLiveActivityRenderFailureQueue? {
    guard
      let group = VoltraConfig.groupIdentifier(),
      let directoryURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
    else {
      return nil
    }
    return VoltraDynamicLiveActivityRenderFailureQueue(
      storage: VoltraDynamicLiveActivityRenderFailureFileStorage(directoryURL: directoryURL)
    )
  }

  @discardableResult
  public static func record(activityName: String, definitionId: String, message: String) -> Bool {
    let failure = VoltraDynamicLiveActivityRenderFailure(
      activityName: activityName,
      definitionId: definitionId,
      message: message
    )
    let persisted = queue?.record(failure) ?? false
    VoltraLogger.activity.error(
      "[DynamicLiveActivity] activity=\(failure.activityName, privacy: .public) definitionId=\(failure.definitionId, privacy: .public) \(failure.message, privacy: .public)"
    )
    if persisted {
      VoltraDynamicLiveActivityRenderFailureNotifier.shared.post()
    } else {
      VoltraLogger.event.error("Failed to persist Dynamic Live Activity render failure")
    }
    return persisted
  }

  public static func drain() -> [VoltraDynamicLiveActivityRenderFailure] {
    queue?.drain() ?? []
  }

  /// The returned token must be removed when the JS bridge listener goes away.
  public static func observeChanges(_ handler: @escaping () -> Void) -> UUID {
    VoltraDynamicLiveActivityRenderFailureNotifier.shared.add(handler)
  }

  public static func removeChangeObserver(_ token: UUID) {
    VoltraDynamicLiveActivityRenderFailureNotifier.shared.remove(token)
  }
}
