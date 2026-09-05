import Foundation

/// The unit everything server-driven is keyed by: settings, fetched props, the stored ETag, fetch
/// coalescing, and the settings revision.
///
/// Today the only case is a whole widget id. Per-instance server updates (ADR 0002,
/// "Instance-ready") add an `instance` case above it without changing a single caller, which is
/// the reason this is a type rather than a bare `String`.
public enum WidgetScope: Hashable, Sendable {
  case widget(id: String)

  /// Widget id this scope belongs to. An instance scope will report the id it is an instance of.
  public var widgetId: String {
    switch self {
    case let .widget(id):
      return id
    }
  }

  /// Stable key for per-scope storage. An instance scope will append its placement key, so
  /// widget-scoped records written today keep their keys.
  public var storageKey: String {
    switch self {
    case let .widget(id):
      return id
    }
  }

  /// Convenience for the common case, so callers do not spell out the case name.
  public static func of(_ widgetId: String) -> WidgetScope {
    .widget(id: widgetId)
  }
}
