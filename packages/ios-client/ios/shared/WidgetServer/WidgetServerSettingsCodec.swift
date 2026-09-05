import Foundation

/// Serializes one settings layer for storage. Written as a small versioned envelope so a future
/// shape change can be recognised rather than guessed at, the same way Dynamic Widget props are
/// stored.
public enum WidgetServerSettingsCodec {
  private static let versionKey = "widgetServerSettingsVersion"
  private static let settingsKey = "widgetServerSettings"
  private static let version = 1

  public static func encode(_ settings: WidgetServerUpdateSettings) -> Data? {
    var payload: [String: Any] = [:]

    settings.url.map { payload["url"] = $0 }
    settings.intervalMinutes.map { payload["intervalMinutes"] = $0 }
    settings.enabled.map { payload["enabled"] = $0 }
    settings.method.map { payload["method"] = $0 }
    settings.query.map { payload["query"] = $0 }
    settings.headers.map { payload["headers"] = $0 }
    settings.body.map { payload["body"] = $0 }

    let envelope: [String: Any] = [versionKey: version, settingsKey: payload]

    return try? JSONSerialization.data(withJSONObject: envelope)
  }

  /// Returns nil for anything this version cannot read, so a bad record reads as "no opinion".
  public static func decode(_ data: Data?) -> WidgetServerUpdateSettings? {
    guard let data,
          let envelope = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          envelope[versionKey] as? Int == version,
          let payload = envelope[settingsKey] as? [String: Any]
    else {
      return nil
    }

    return WidgetServerUpdateSettings(
      url: payload["url"] as? String,
      intervalMinutes: payload["intervalMinutes"] as? Int,
      enabled: payload["enabled"] as? Bool,
      method: payload["method"] as? String,
      query: payload["query"] as? [String: String],
      headers: payload["headers"] as? [String: String],
      body: payload["body"] as? String
    )
  }
}
