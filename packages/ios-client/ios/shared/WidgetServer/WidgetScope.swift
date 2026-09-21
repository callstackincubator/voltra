import Foundation

/// The unit everything server-driven is keyed by: settings, fetched props, the stored ETag, fetch
/// coalescing, and the settings revision.
///
/// `.widget` is a whole widget id. `.instance` (ADR 0007) is one distinct merged configuration of a
/// widget: two placements with identical configuration share one key, one fetch, one ETag and one
/// props slot. The settings resolver, ETag store, status store, runner and request builder take
/// either case with no signature change; the settings layers keep resolving by widget id, so an
/// instance inherits the widget's URL, interval, method, headers and body.
public enum WidgetScope: Hashable, Sendable {
  case widget(id: String)

  /// One distinct merged configuration of `id`. `key` is the hash of that configuration's
  /// canonical serialization (see `WidgetCanonicalConfiguration`) — opaque, stable, and produced
  /// identically on Android for the same configuration. WidgetKit has no placement id, so this is
  /// the only identity an iOS placement can have.
  case instance(id: String, key: String)

  /// Widget id this scope belongs to. An instance scope reports the id it is an instance of.
  public var widgetId: String {
    switch self {
    case let .widget(id):
      return id
    case let .instance(id, _):
      return id
    }
  }

  /// Stable key for per-scope storage. An instance scope appends its placement key, so
  /// widget-scoped records written today keep their keys.
  public var storageKey: String {
    switch self {
    case let .widget(id):
      return id
    case let .instance(id, key):
      return "\(id)#\(key)"
    }
  }

  /// Convenience for the common case, so callers do not spell out the case name.
  public static func of(_ widgetId: String) -> WidgetScope {
    .widget(id: widgetId)
  }

  /// The scope for one placement's merged `configuration` (ADR 0007): `.instance` when the
  /// configuration is non-empty, `.widget` when it is — a widget with no configuration parameters
  /// has exactly one instance, the widget scope, and its requests and storage are unchanged.
  public static func of(_ widgetId: String, configuration: [String: String]) -> WidgetScope {
    if let key = WidgetCanonicalConfiguration.key(configuration) {
      return .instance(id: widgetId, key: key)
    }
    return .widget(id: widgetId)
  }
}
