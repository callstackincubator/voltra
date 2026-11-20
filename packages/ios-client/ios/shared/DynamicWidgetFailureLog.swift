import Foundation

/// One line per failed Dynamic Widget render, and one when a placement recovers (ADR 0013 §6).
///
/// ```
/// [DynamicWidget] render failed widgetId=inbox family=systemMedium stage=render dev=true: TypeError: ...
/// [DynamicWidget] render recovered widgetId=inbox family=systemMedium
/// ```
///
/// Recovery is tracked per `(widgetId, family)`: a View body runs once per scheme and rendering
/// mode, so a per-render tracker would log a failure and a recovery on every round.
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
  private var failing: Set<String> = []

  public init(sink: @escaping (Level, String) -> Void) {
    self.sink = sink
  }

  public func failed(widgetId: String, family: String, failure: DynamicWidgetRenderFailure, isDev: Bool) {
    lock.lock()
    failing.insert(trackingKey(widgetId, family))
    lock.unlock()

    var line = "[DynamicWidget] render failed widgetId=\(widgetId) family=\(family) stage=\(failure.stage.rawValue) dev=\(isDev): \(failure.message)"
    if isDev, let stack = failure.stack, !stack.isEmpty {
      line += "\n\(stack)"
    }
    sink(.error, line)
  }

  public func succeeded(widgetId: String, family: String) {
    lock.lock()
    let recovered = failing.remove(trackingKey(widgetId, family)) != nil
    lock.unlock()

    if recovered {
      sink(.info, "[DynamicWidget] render recovered widgetId=\(widgetId) family=\(family)")
    }
  }

  private func trackingKey(_ widgetId: String, _ family: String) -> String {
    "\(widgetId)|\(family)"
  }
}
