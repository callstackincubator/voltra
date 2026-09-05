import Foundation

/// Server-update settings as one layer holds them: every field is optional, and an unset field
/// means "this layer has no opinion, ask the layer below".
///
/// `body` is kept as the raw JSON text the app supplied rather than a parsed tree, because Voltra
/// never inspects it — it only forwards it as the request body.
public struct WidgetServerUpdateSettings: Equatable, Sendable {
  public var url: String?
  public var intervalMinutes: Int?
  public var enabled: Bool?
  public var method: String?
  public var query: [String: String]?
  public var headers: [String: String]?
  public var body: String?

  public init(
    url: String? = nil,
    intervalMinutes: Int? = nil,
    enabled: Bool? = nil,
    method: String? = nil,
    query: [String: String]? = nil,
    headers: [String: String]? = nil,
    body: String? = nil
  ) {
    self.url = url
    self.intervalMinutes = intervalMinutes
    self.enabled = enabled
    self.method = method
    self.query = query
    self.headers = headers
    self.body = body
  }

  public var isEmpty: Bool {
    url == nil && intervalMinutes == nil && enabled == nil && method == nil
      && query == nil && headers == nil && body == nil
  }

  public static let empty = WidgetServerUpdateSettings()
}

/// The flattened settings a fetch actually runs on. Every field is decided: `intervalMinutes` has
/// the floor and ceiling applied, `enabled` and `method` have their defaults filled in, and `query`
/// and `headers` are the per-key merge of every layer.
///
/// `url` is the one field that can still be absent, and it means the widget is server-driven but
/// has nowhere to fetch from yet — the app is expected to supply one with `setWidgetServerUpdate`.
public struct ResolvedWidgetServerSettings: Equatable, Sendable {
  public let url: String?
  public let intervalMinutes: Int
  public let enabled: Bool
  public let method: String
  public let query: [String: String]
  public let headers: [String: String]
  public let body: String?

  public init(
    url: String?,
    intervalMinutes: Int,
    enabled: Bool,
    method: String,
    query: [String: String],
    headers: [String: String],
    body: String?
  ) {
    self.url = url
    self.intervalMinutes = intervalMinutes
    self.enabled = enabled
    self.method = method
    self.query = query
    self.headers = headers
    self.body = body
  }

  /// True when this widget has both a URL to fetch and permission to do it.
  public var shouldFetch: Bool {
    guard enabled, let url, !url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return false
    }

    return true
  }
}

public enum WidgetServerUpdateDefaults {
  /// WidgetKit stretches a timeline asking for entries much closer together than five minutes, and
  /// the reload budget is shared across every widget in the app, so a smaller number would only
  /// misreport what the widget actually does. Matches Android's WorkManager floor.
  public static let minIntervalMinutes = 15

  /// A day. Past this the widget is effectively not server-driven, and `Cache-Control: max-age`
  /// from a misconfigured server should not be able to park a widget for a week.
  public static let maxIntervalMinutes = 24 * 60

  public static let defaultIntervalMinutes = minIntervalMinutes

  public static let defaultMethod = "GET"

  /// Methods either platform's HTTP stack can send.
  public static let supportedMethods: Set<String> = ["GET", "POST", "PUT", "PATCH", "DELETE"]

  /// Methods that cannot carry a body. A body set alongside one of these is dropped.
  public static let bodylessMethods: Set<String> = ["GET", "HEAD"]

  /// Query keys Voltra puts on every request. An app that set one of these would silently shadow
  /// what the server relies on, so `setWidgetServerUpdate` rejects them.
  public static let reservedQueryKeys: Set<String> = ["widgetId", "platform", "family", "theme", "locale", "instance"]

  /// Serialized size cap for one layer, so a runaway `body` cannot fill the settings store.
  public static let maxLayerBytes = 16 * 1024

  /// Response bodies larger than this are refused. The widget extension has a 30 MB ceiling for
  /// the whole render, and a widget needing a quarter of a megabyte of props will not fit on a
  /// home screen either.
  public static let maxBodyBytes = 256 * 1024

  public static func clampIntervalMinutes(_ intervalMinutes: Int) -> Int {
    min(max(intervalMinutes, minIntervalMinutes), maxIntervalMinutes)
  }
}
