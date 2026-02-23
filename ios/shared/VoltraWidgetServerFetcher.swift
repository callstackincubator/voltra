import Foundation

/// Handles fetching widget content from a remote Voltra SSR server.
/// Used by the TimelineProvider to pull server-driven widget updates.
public enum VoltraWidgetServerFetcher {
  /// Errors that can occur during server fetch
  public enum FetchError: Error, LocalizedError {
    case noServerUrl
    case invalidUrl(String)
    case networkError(Error)
    case httpError(statusCode: Int)
    case invalidResponse
    case emptyResponse

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
      }
    }
  }

  /// Read the server update URL for a widget from Info.plist / UserDefaults config.
  public static func serverUrl(for widgetId: String) -> String? {
    // Check Info.plist first (set at build time by config plugin)
    if let urls = Bundle.main.object(forInfoDictionaryKey: "Voltra_WidgetServerUrls") as? [String: String],
       let url = urls[widgetId]
    {
      return url
    }

    // Fallback to UserDefaults (can be set at runtime)
    if let group = VoltraConfig.groupIdentifier(),
       let defaults = UserDefaults(suiteName: group)
    {
      return defaults.string(forKey: "Voltra_Widget_ServerUrl_\(widgetId)")
    }

    return nil
  }

  /// Read the update interval (in minutes) for a widget.
  public static func updateInterval(for widgetId: String) -> Int {
    if let intervals = Bundle.main.object(forInfoDictionaryKey: "Voltra_WidgetServerIntervals") as? [String: Int],
       let interval = intervals[widgetId]
    {
      return interval
    }
    return 60 // default: 1 hour
  }

  /// Fetch widget content from the remote Voltra SSR server.
  ///
  /// The request includes:
  /// - `widgetId` query parameter
  /// - `family` query parameter (e.g., "systemSmall")
  /// - `Authorization: Bearer <token>` header (if credentials stored in Keychain)
  /// - Any custom headers stored in Keychain
  ///
  /// Returns the raw JSON data from the server, ready to be parsed by VoltraNode.
  public static func fetchWidgetContent(
    widgetId: String,
    family: String
  ) async throws -> Data {
    guard let baseUrl = serverUrl(for: widgetId) else {
      throw FetchError.noServerUrl
    }

    // Build URL with query parameters
    guard var components = URLComponents(string: baseUrl) else {
      throw FetchError.invalidUrl(baseUrl)
    }

    var queryItems = components.queryItems ?? []
    queryItems.append(URLQueryItem(name: "widgetId", value: widgetId))
    queryItems.append(URLQueryItem(name: "family", value: family))
    components.queryItems = queryItems

    guard let url = components.url else {
      throw FetchError.invalidUrl(baseUrl)
    }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.timeoutInterval = 15 // Widgets have limited execution time

    // Add auth token from Keychain if available
    if let token = VoltraKeychainHelper.readToken() {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    // Add custom headers from Keychain if available
    if let headers = VoltraKeychainHelper.readHeaders() {
      for (key, value) in headers {
        request.setValue(value, forHTTPHeaderField: key)
      }
    }

    // Add Voltra-specific headers
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("VoltraWidget/1.0", forHTTPHeaderField: "User-Agent")

    do {
      let (data, response) = try await URLSession.shared.data(for: request)

      guard let httpResponse = response as? HTTPURLResponse else {
        throw FetchError.invalidResponse
      }

      guard (200 ... 299).contains(httpResponse.statusCode) else {
        throw FetchError.httpError(statusCode: httpResponse.statusCode)
      }

      guard !data.isEmpty else {
        throw FetchError.emptyResponse
      }

      return data
    } catch let error as FetchError {
      throw error
    } catch {
      throw FetchError.networkError(error)
    }
  }
}
