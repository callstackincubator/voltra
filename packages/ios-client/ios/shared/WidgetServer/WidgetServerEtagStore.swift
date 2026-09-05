import Foundation

/// The ETag from the last `200`, stored with the URL it came from.
///
/// Keeping the URL alongside it is what makes `If-None-Match` safe once the app can change the URL
/// at runtime: an ETag minted by one endpoint says nothing about another, and sending it could
/// produce a `304` that leaves the widget showing the previous endpoint's data forever.
///
/// Lives in the App Group so the widget extension and the app agree on it. Without an App Group
/// there is nowhere shared to put it, and the widget simply revalidates nothing.
public enum WidgetServerEtagStore {
  /// The stored ETag, but only if it was minted by `url`.
  public static func etag(for scope: WidgetScope, url: String?) -> String? {
    guard let url, let defaults = defaults(),
          defaults.string(forKey: urlKey(scope)) == url
    else {
      return nil
    }

    return defaults.string(forKey: etagKey(scope))
  }

  public static func put(_ etag: String?, for scope: WidgetScope, url: String) {
    guard let defaults = defaults() else { return }

    guard let etag else {
      clear(scope)
      return
    }

    defaults.set(etag, forKey: etagKey(scope))
    defaults.set(url, forKey: urlKey(scope))
  }

  public static func clear(_ scope: WidgetScope) {
    guard let defaults = defaults() else { return }

    defaults.removeObject(forKey: etagKey(scope))
    defaults.removeObject(forKey: urlKey(scope))
  }

  private static func defaults() -> UserDefaults? {
    guard let group = VoltraConfig.groupIdentifier() else { return nil }

    return UserDefaults(suiteName: group)
  }

  private static func etagKey(_ scope: WidgetScope) -> String {
    "Voltra_WidgetServerEtag_\(scope.storageKey)"
  }

  private static func urlKey(_ scope: WidgetScope) -> String {
    "Voltra_WidgetServerEtagUrl_\(scope.storageKey)"
  }
}
