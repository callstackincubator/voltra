import Foundation

/// Call-time rules for `setWidgetServerUpdate`. Rejecting here rather than at fetch time means the
/// app learns about a bad setting from the promise it just awaited, instead of from a widget that
/// quietly stops updating hours later.
public enum WidgetServerSettingsValidator {
  /// Hosts reachable over plain http, so a debug build can talk to a dev server.
  static let localHttpHosts: Set<String> = ["localhost", "127.0.0.1", "::1", "10.0.2.2", "10.0.3.2"]

  /// - Parameter isDebugBuild: whether plain http to a local dev host is allowed. Release builds
  ///   have App Transport Security blocking it anyway, so allowing it there would only defer the
  ///   failure.
  /// - Returns: an error message, or nil when the settings are usable.
  public static func validate(_ settings: WidgetServerUpdateSettings, isDebugBuild: Bool) -> String? {
    if let url = settings.url, let error = validateUrl(url, isDebugBuild: isDebugBuild) {
      return error
    }

    if let interval = settings.intervalMinutes, interval <= 0 {
      return "intervalMinutes must be a positive number of minutes"
    }

    if let method = settings.method,
       !WidgetServerUpdateDefaults.supportedMethods.contains(method.uppercased())
    {
      let supported = WidgetServerUpdateDefaults.supportedMethods.sorted().joined(separator: ", ")
      return "method '\(method)' is not supported. Use one of \(supported)"
    }

    for key in settings.query?.keys ?? [String: String]().keys
      where WidgetServerUpdateDefaults.reservedQueryKeys.contains(key)
    {
      return "query key '\(key)' is reserved by Voltra and is sent on every request"
    }

    if let encoded = WidgetServerSettingsCodec.encode(settings),
       encoded.count > WidgetServerUpdateDefaults.maxLayerBytes
    {
      return "settings are larger than \(WidgetServerUpdateDefaults.maxLayerBytes) bytes once serialized"
    }

    return nil
  }

  private static func validateUrl(_ url: String, isDebugBuild: Bool) -> String? {
    if url.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
      return "url must not be empty"
    }

    guard let components = URLComponents(string: url),
          let scheme = components.scheme?.lowercased(),
          let host = components.host,
          !host.isEmpty
    else {
      return "url '\(url)' must be an absolute http(s) URL"
    }

    if scheme == "https" {
      return nil
    }

    if scheme != "http" {
      return "url '\(url)' must be an absolute http(s) URL"
    }

    if isDebugBuild, localHttpHosts.contains(host) {
      return nil
    }

    let hosts = localHttpHosts.sorted().joined(separator: ", ")
    return "url '\(url)' must use https. Plain http is allowed only in a debug build, and only for \(hosts)."
  }
}
