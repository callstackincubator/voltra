import Foundation

/// Reads the settings object an app passes to `setWidgetServerUpdate`.
///
/// Separate from `WidgetServerSettingsCodec`, which is the versioned storage format: what the app
/// sends and what Voltra persists are allowed to diverge, and conflating them would make either one
/// hard to change. The one real difference today is `body`, which arrives as arbitrary JSON and is
/// kept as text because Voltra only forwards it.
public enum WidgetServerUpdateSettingsJson {
  public enum Result: Equatable {
    case parsed(WidgetServerUpdateSettings)
    case invalid(reason: String)
  }

  public static func parse(_ json: String) -> Result {
    guard let object = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else {
      return .invalid(reason: "settings must be a JSON object")
    }

    guard let query = stringMap(object, "query") else {
      return .invalid(reason: "query must be an object of strings")
    }

    guard let headers = stringMap(object, "headers") else {
      return .invalid(reason: "headers must be an object of strings")
    }

    var body: String?

    if let rawBody = object["body"], !(rawBody is NSNull) {
      guard let text = jsonText(rawBody) else {
        return .invalid(reason: "body must be a JSON value")
      }

      body = text
    }

    return .parsed(
      WidgetServerUpdateSettings(
        url: object["url"] as? String,
        intervalMinutes: object["intervalMinutes"] as? Int,
        enabled: object["enabled"] as? Bool,
        method: (object["method"] as? String)?.uppercased(),
        query: object["query"] == nil ? nil : query,
        headers: object["headers"] == nil ? nil : headers,
        body: body
      )
    )
  }

  /// The other direction of `parse`: serializes settings back to the same JSON shape, for
  /// `getWidgetServerUpdate` to hand across the bridge. No envelope — that is
  /// `WidgetServerSettingsCodec`'s job for storage, not this one's for a single read.
  public static func stringify(_ settings: WidgetServerUpdateSettings) -> String? {
    var object: [String: Any] = [:]

    if let url = settings.url {
      object["url"] = url
    }
    if let intervalMinutes = settings.intervalMinutes {
      object["intervalMinutes"] = intervalMinutes
    }
    if let enabled = settings.enabled {
      object["enabled"] = enabled
    }
    if let method = settings.method {
      object["method"] = method
    }
    if let query = settings.query {
      object["query"] = query
    }
    if let headers = settings.headers {
      object["headers"] = headers
    }

    if let body = settings.body {
      guard let bodyData = body.data(using: .utf8),
            let bodyValue = try? JSONSerialization.jsonObject(with: bodyData, options: [.fragmentsAllowed])
      else {
        return nil
      }

      object["body"] = bodyValue
    }

    guard let data = try? JSONSerialization.data(withJSONObject: object) else { return nil }

    return String(data: data, encoding: .utf8)
  }

  /// Re-serializes a parsed value back to JSON text. A string body has to keep its quotes: without
  /// them the request would carry something that is not JSON at all.
  private static func jsonText(_ value: Any) -> String? {
    if JSONSerialization.isValidJSONObject(value) {
      return (try? JSONSerialization.data(withJSONObject: value)).flatMap { String(data: $0, encoding: .utf8) }
    }

    // A top-level scalar is not a valid JSON *object*, so it is wrapped, encoded and unwrapped.
    guard let wrapped = try? JSONSerialization.data(withJSONObject: ["v": value]),
          let text = String(data: wrapped, encoding: .utf8),
          let start = text.firstIndex(of: ":")
    else {
      return nil
    }

    return String(text[text.index(after: start) ..< text.index(before: text.endIndex)])
  }

  /// Returns an empty map when the key is absent, and nil when it is present but not usable.
  private static func stringMap(_ object: [String: Any], _ key: String) -> [String: String]? {
    guard let raw = object[key], !(raw is NSNull) else { return [:] }

    return raw as? [String: String]
  }
}
