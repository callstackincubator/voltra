import Foundation

/// Fetches a Voltra payload from the server for a payload-driven widget.
///
/// Since ADR 0002 the request itself is built by `shared/WidgetServer`, the same code the Dynamic
/// engine uses. With no runtime settings set, that produces the request this fetcher always sent,
/// plus `locale` and a conditional `If-None-Match`; with settings set, this widget gains the
/// runtime URL, method, headers, query and body too. What the timeline does with the response is
/// unchanged.
public enum VoltraWidgetServerFetcher {
  /// Errors that can occur during server fetch
  public enum FetchError: Error, LocalizedError {
    case noServerUrl
    case invalidUrl(String)
    case networkError(Error)
    case httpError(statusCode: Int)
    case invalidResponse
    case emptyResponse
    /// `304`: what is already stored is still current, so there is nothing new to render.
    case notModified

    public var errorDescription: String? {
      switch self {
      case .noServerUrl:
        return "No server URL configured for this widget"
      case let .invalidUrl(url):
        return "Invalid server URL: \(url)"
      case let .networkError(error):
        return "Network error: \(error.localizedDescription)"
      case let .httpError(statusCode):
        return "HTTP error: \(statusCode)"
      case .invalidResponse:
        return "Invalid response from server"
      case .emptyResponse:
        return "Empty response from server"
      case .notModified:
        return "Server content is unchanged"
      }
    }
  }

  /// The URL this widget will fetch from, after runtime overrides. Callers use it to decide
  /// whether a widget is server-driven at all before starting a timeline.
  public static func serverUrl(for widgetId: String) -> String? {
    VoltraWidgetServer.resolver.resolve(.of(widgetId)).url
  }

  /// The resolved interval, in minutes. Runtime settings win over app.json.
  public static func updateInterval(for widgetId: String) -> Int {
    VoltraWidgetServer.resolver.resolve(.of(widgetId)).intervalMinutes
  }

  /// Whether the widget draws a refresh button. Build-time only: the button is generated UI
  /// structure, so unlike the URL and the interval it cannot be changed at runtime.
  public static func isRefreshEnabled(for widgetId: String) -> Bool {
    VoltraWidgetServer.isRefreshEnabled(for: widgetId)
  }

  /// Fetch widget content from the remote Voltra SSR server.
  ///
  /// The request carries `widgetId`, `family`, `platform`, `theme` and `locale` as query
  /// parameters, `Accept: application/json`, a Voltra user agent, whatever headers the app has set
  /// — including `Authorization` from the deprecated credential API — and `If-None-Match` when a
  /// stored ETag belongs to the URL being fetched.
  ///
  /// Returns the raw JSON data from the server, ready to be parsed by VoltraNode.
  public static func fetchWidgetContent(
    widgetId: String,
    family: String
  ) async throws -> Data {
    let scope = WidgetScope.of(widgetId)
    let settings = VoltraWidgetServer.resolver.resolve(scope)

    guard let url = settings.url else {
      throw FetchError.noServerUrl
    }

    guard let request = WidgetServerRequestBuilder.build(
      scope: scope,
      settings: settings,
      context: VoltraWidgetAppearance.requestContext(family: family),
      etag: WidgetServerEtagStore.etag(for: scope, url: url)
    ) else {
      throw FetchError.invalidUrl(url)
    }

    switch await WidgetServerFetcher.fetch(request) {
    case let .success(body, etag, _, _):
      guard !body.isEmpty else {
        throw FetchError.emptyResponse
      }

      WidgetServerEtagStore.put(etag, for: scope, url: url)
      return body

    case .notModified:
      throw FetchError.notModified

    case let .httpFailure(statusCode, _):
      throw FetchError.httpError(statusCode: statusCode)

    case let .networkFailure(message):
      throw FetchError.networkError(NSError(domain: "VoltraWidgetServerFetcher", code: -1, userInfo: [
        NSLocalizedDescriptionKey: message,
      ]))
    }
  }
}
