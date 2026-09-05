import Foundation

/// Build-time server-update defaults, read from the Info.plist keys the config plugin and the CLI
/// write.
///
/// `Voltra_WidgetServerIntervals` carries an entry for every server-driven widget, so its keys are
/// the set of widget ids this app may fetch for. `Voltra_WidgetServerUrls` carries only the ones
/// app.json gave a URL; the rest expect one at runtime from `setWidgetServerUpdate`.
struct ConfigWidgetServerSettingsLayer: WidgetServerSettingsLayer {
  let name = "config"

  private let urls: [String: String]
  private let intervals: [String: Int]

  init(bundle: Bundle = .main) {
    urls = bundle.object(forInfoDictionaryKey: VoltraStorageKeys.widgetServerUrls) as? [String: String] ?? [:]
    intervals = bundle.object(forInfoDictionaryKey: VoltraStorageKeys.widgetServerIntervals) as? [String: Int] ?? [:]
  }

  init(urls: [String: String], intervals: [String: Int]) {
    self.urls = urls
    self.intervals = intervals
  }

  func settings(for scope: WidgetScope) -> WidgetServerUpdateSettings? {
    guard let interval = intervals[scope.widgetId] else { return nil }

    return WidgetServerUpdateSettings(url: urls[scope.widgetId], intervalMinutes: interval)
  }

  func isServerDriven(_ scope: WidgetScope) -> Bool {
    intervals[scope.widgetId] != nil
  }

  var serverDrivenWidgetIds: Set<String> {
    Set(intervals.keys)
  }
}

/// Assembles the settings stack for the process.
///
/// Everything that needs server-update settings goes through here: the payload timeline, the
/// Dynamic Widget timeline, and the bridge methods. Neither engine reads Info.plist, the Keychain,
/// or the credential records on its own, which is what keeps the layer order and the merge rule in
/// one place.
public enum VoltraWidgetServer {
  private static let configLayer = ConfigWidgetServerSettingsLayer()

  /// Fixed order, lowest priority first. An instance layer will slot in above `widget`.
  public static let resolver = WidgetServerSettingsResolver(
    layers: [
      configLayer,
      CredentialsWidgetServerSettingsLayer(),
      GlobalWidgetServerSettingsLayer(),
      WidgetWidgetServerSettingsLayer(),
    ],
    revisionSource: { WidgetServerSettingsStore.revision() }
  )

  /// Every widget app.json marked server-driven, whichever engine renders it.
  public static var serverDrivenWidgetIds: Set<String> {
    configLayer.serverDrivenWidgetIds
  }

  public static func isServerDriven(_ widgetId: String) -> Bool {
    configLayer.isServerDriven(.of(widgetId))
  }

  /// Whether the widget draws a refresh button. Build-time only: the button is generated UI
  /// structure, so unlike the URL and the interval it cannot be changed at runtime.
  public static func isRefreshEnabled(for widgetId: String) -> Bool {
    guard let refresh = Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.widgetServerRefresh) as? [String: Bool] else {
      return false
    }

    return refresh[widgetId] ?? false
  }

  /// Whether plain http to a local dev host is allowed. Release builds have App Transport Security
  /// blocking cleartext anyway, so accepting such a URL there would only move the failure to fetch
  /// time.
  public static var isDebugBuild: Bool {
    #if DEBUG
      return true
    #else
      return false
    #endif
  }

  /// The device state a request carries. The theme is passed in rather than read here so this
  /// whole module stays free of UIKit and the request contract can be tested without a simulator;
  /// `VoltraWidgetAppearance` is the UIKit-side helper that supplies it.
  public static func requestContext(theme: String, family: String? = nil) -> WidgetServerRequestContext {
    WidgetServerRequestContext(
      theme: theme,
      locale: bcp47Locale(),
      userAgent: userAgent(),
      family: family
    )
  }

  /// The device locale as a BCP-47 tag, so a backend sees `en-US` from both platforms.
  /// `Locale.identifier` is the ICU form (`en_US`), which is not what the contract promises.
  static func bcp47Locale(_ locale: Locale = .current) -> String {
    if #available(iOS 16.0, macOS 13.0, *) {
      return locale.identifier(.bcp47)
    }

    return locale.identifier.replacingOccurrences(of: "_", with: "-")
  }

  static func userAgent() -> String {
    "VoltraWidget/\(VoltraConfig.voltraVersion()) (iOS/\(systemVersion))"
  }

  /// `UIDevice.current.systemVersion` is main-actor isolated and a timeline provider is not, so
  /// the OS version comes from `ProcessInfo`, which is not.
  private static var systemVersion: String {
    let version = ProcessInfo.processInfo.operatingSystemVersion

    return "\(version.majorVersion).\(version.minorVersion).\(version.patchVersion)"
  }

  /// Resolves settings and builds the request for one scope, or returns nil when there is nothing
  /// to fetch.
  public static func request(
    for scope: WidgetScope,
    context: WidgetServerRequestContext,
    etag: String? = nil
  ) -> URLRequest? {
    WidgetServerRequestBuilder.build(
      scope: scope,
      settings: resolver.resolve(scope),
      context: context,
      etag: etag
    )
  }
}
