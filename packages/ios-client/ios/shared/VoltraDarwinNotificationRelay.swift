import CoreFoundation
import Foundation

/// Cross-process "something changed" signal for the App Group backed queues. Darwin notifications
/// carry no payload, so consumers always read storage after a signal.
final class VoltraDarwinNotificationRelay {
  static let renderFailures = VoltraDarwinNotificationRelay(name: "com.voltra.dynamicLiveActivityRenderFailures")
  static let interactions = VoltraDarwinNotificationRelay(name: "com.voltra.interactions")

  private let lock = NSLock()
  private var handlers: [UUID: () -> Void] = [:]
  private let name: CFString

  private init(name: String) {
    self.name = name as CFString
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      Unmanaged.passUnretained(self).toOpaque(),
      Self.didReceive,
      self.name,
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
    Unmanaged<VoltraDarwinNotificationRelay>
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
