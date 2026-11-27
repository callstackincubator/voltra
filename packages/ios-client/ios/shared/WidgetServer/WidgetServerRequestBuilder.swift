import Foundation

/// The device state a request carries that is not part of the settings: the theme and locale the
/// widget is being drawn in, and who is asking.
///
/// Passed in rather than read here so the request contract can be tested without UIKit, and so a
/// timeline request built for one appearance cannot accidentally report another.
public struct WidgetServerRequestContext: Equatable, Sendable {
  public let theme: String
  public let locale: String
  public let userAgent: String
  /// Only payload widgets send `family`: one Dynamic Widget fetch serves every size, so its props
  /// must be size-agnostic and the entry picks its layout from `env.widgetFamily`.
  public let family: String?

  public init(theme: String, locale: String, userAgent: String, family: String? = nil) {
    self.theme = theme
    self.locale = locale
    self.userAgent = userAgent
    self.family = family
  }
}

/// Turns resolved settings plus Voltra's own request parameters into the request the device sends.
///
/// Both engines build their requests here, so a payload widget and a Dynamic Widget send the same
/// shape and the app's runtime overrides apply to both. Only the response and what the device does
/// with it differ.
public enum WidgetServerRequestBuilder {
  /// Widgets have limited execution time, so a request that has not answered in this long is not
  /// going to be useful even if it eventually does.
  public static let timeoutSeconds: TimeInterval = 15

  /// - Parameter etag: from the last `200`, sent as `If-None-Match`. Callers pass nil when the
  ///   stored ETag belongs to a different URL than the one being fetched now.
  /// - Returns: nil when there is nothing to fetch — no URL, fetching is off, or the URL will not
  ///   parse.
  public static func build(
    scope: WidgetScope,
    settings: ResolvedWidgetServerSettings,
    context: WidgetServerRequestContext,
    etag: String? = nil,
    // The placement's merged configuration (ADR 0007). Empty for a widget with no configuration
    // parameters, or when the caller only knows the scope's key — the caller is responsible for
    // passing the same map that produced `scope`'s key, since the key alone cannot be reversed
    // back into the configuration that produced it.
    configuration: [String: String] = [:]
  ) -> URLRequest? {
    guard settings.shouldFetch, let url = settings.url, var components = URLComponents(string: url) else {
      return nil
    }

    var queryItems = components.queryItems ?? []
    queryItems.append(URLQueryItem(name: "widgetId", value: scope.widgetId))
    queryItems.append(URLQueryItem(name: "platform", value: "ios"))

    if let family = context.family {
      queryItems.append(URLQueryItem(name: "family", value: family))
    }

    queryItems.append(URLQueryItem(name: "theme", value: context.theme))
    queryItems.append(URLQueryItem(name: "locale", value: context.locale))

    // Present for every method, absent when the widget has no configuration parameters (ADR
    // 0007). `instance` is the hash of the canonical `configuration`, sent so a backend can cache
    // or log per instance without recomputing it.
    if case let .instance(_, key) = scope, let canonicalConfiguration = WidgetCanonicalConfiguration.canonicalize(configuration) {
      queryItems.append(URLQueryItem(name: "instance", value: key))
      queryItems.append(URLQueryItem(name: "configuration", value: canonicalConfiguration))
    }

    // Voltra's own keys are appended first and the app's keys are rejected at call time if they
    // collide, so nothing here can shadow what the server relies on.
    for key in settings.query.keys.sorted() {
      queryItems.append(URLQueryItem(name: key, value: settings.query[key]))
    }

    components.queryItems = queryItems

    guard let resolvedUrl = components.url else { return nil }

    var request = URLRequest(url: resolvedUrl)
    let method = settings.method.uppercased()

    request.httpMethod = method
    request.timeoutInterval = timeoutSeconds
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue(context.userAgent, forHTTPHeaderField: "User-Agent")

    for (key, value) in settings.headers {
      request.setValue(value, forHTTPHeaderField: key)
    }

    if let etag {
      request.setValue(etag, forHTTPHeaderField: "If-None-Match")
    }

    if let body = settings.body {
      if WidgetServerUpdateDefaults.bodylessMethods.contains(method) {
        // URLSession sends a Content-Length and drops the body on GET, so the server would see a
        // request the app did not mean to send. Dropping it here is the lesser surprise, and it is
        // documented.
        VoltraLogger.widget.warning(
          "Dropping request body for widget '\(scope.widgetId, privacy: .public)': \(method, privacy: .public) cannot carry one"
        )
      } else {
        request.httpBody = Data(body.utf8)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      }
    }

    return request
  }
}
