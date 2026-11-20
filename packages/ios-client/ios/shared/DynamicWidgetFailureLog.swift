import Foundation

/// One line per failed Dynamic Widget render, and one when a placement recovers (ADR 0013 §6).
///
/// ```
/// [DynamicWidget] render failed widgetId=inbox family=systemMedium stage=render dev=true: TypeError: ...
/// [DynamicWidget] render recovered widgetId=inbox family=systemMedium
/// ```
///
/// Recovery is tracked per `DynamicWidgetRenderKey`, the same key as the last good render: a View
/// body runs once per family, scheme and rendering mode, and two placements or appearances that
/// differ in failing and succeeding would otherwise log a failure and a recovery on every round.
public final class DynamicWidgetFailureLog {
  public enum Level { case error, info }

  public static let shared = DynamicWidgetFailureLog { level, message in
    switch level {
    case .error: VoltraLogger.widget.error("\(message, privacy: .public)")
    case .info: VoltraLogger.widget.info("\(message, privacy: .public)")
    }
  }

  private let sink: (Level, String) -> Void
  private let lock = NSLock()
  private var failing: Set<DynamicWidgetRenderKey> = []

  public init(sink: @escaping (Level, String) -> Void) {
    self.sink = sink
  }

  public func failed(key: DynamicWidgetRenderKey, failure: DynamicWidgetRenderFailure, isDev: Bool) {
    lock.lock()
    failing.insert(key)
    lock.unlock()

    var line = "[DynamicWidget] render failed widgetId=\(key.widgetId) family=\(key.family) stage=\(failure.stage.rawValue) dev=\(isDev): \(failure.message)"
    if isDev, let stack = failure.stack, !stack.isEmpty {
      line += "\n\(stack)"
    }
    sink(.error, line)
  }

  public func succeeded(key: DynamicWidgetRenderKey) {
    lock.lock()
    let recovered = failing.remove(key) != nil
    lock.unlock()

    if recovered {
      sink(.info, "[DynamicWidget] render recovered widgetId=\(key.widgetId) family=\(key.family)")
    }
  }
}
