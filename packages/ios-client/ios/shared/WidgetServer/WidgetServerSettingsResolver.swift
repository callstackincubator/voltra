import Foundation

/// One source of server-update settings. Implementations return a partial
/// `WidgetServerUpdateSettings`, or nil when they have nothing to say about the scope.
///
/// Layers are stacked in a fixed order by `WidgetServerSettingsResolver` and never consulted
/// directly: nothing outside this folder reads Info.plist, the Keychain, or anything else for
/// server-update purposes.
public protocol WidgetServerSettingsLayer: Sendable {
  /// A short name used in logs, so a surprising resolved value can be traced to its source.
  var name: String { get }

  func settings(for scope: WidgetScope) -> WidgetServerUpdateSettings?

  /// Whether this layer knows the scope to be server-driven at all. Only the config layer can
  /// answer this — a runtime layer setting a URL does not turn a locally-rendered widget into a
  /// server-driven one, because the engine is chosen at generate time.
  func isServerDriven(_ scope: WidgetScope) -> Bool
}

public extension WidgetServerSettingsLayer {
  func isServerDriven(_: WidgetScope) -> Bool {
    false
  }
}

/// The only way to read server-update settings.
///
/// Layers are walked lowest to highest and merged by the rule stated once here: `headers` and
/// `query` merge per key, everything else takes the value from the highest layer that sets it.
/// Adding a layer later — an instance layer above `widget`, say — is a new
/// `WidgetServerSettingsLayer` plus one entry in `layers`; this API and every caller stay as they
/// are.
public struct WidgetServerSettingsResolver: Sendable {
  private let layers: [any WidgetServerSettingsLayer]
  private let revisionSource: @Sendable () -> Int

  /// - Parameter layers: lowest priority first: config, credentials, global, widget.
  public init(layers: [any WidgetServerSettingsLayer], revisionSource: @escaping @Sendable () -> Int) {
    self.layers = layers
    self.revisionSource = revisionSource
  }

  /// Flattens every layer for `scope`. Safe to call for any widget: a widget that is not
  /// server-driven resolves to disabled with no URL, so a caller that fetches on `shouldFetch`
  /// does nothing rather than guessing.
  public func resolve(_ scope: WidgetScope) -> ResolvedWidgetServerSettings {
    var merged = WidgetServerUpdateSettings.empty
    var intervalFromConfig = false

    for (index, layer) in layers.enumerated() {
      guard let settings = layer.settings(for: scope) else { continue }

      if settings.intervalMinutes != nil {
        // Index 0 is the config layer. An interval that came from app.json was already validated
        // against this platform's rules when the native project was generated, so clamping it
        // again here would silently change an existing widget's schedule.
        intervalFromConfig = index == 0
      }

      merged = Self.merge(lower: merged, higher: settings)
    }

    let serverDriven = isServerDriven(scope)
    let url = serverDriven ? merged.url.flatMap { $0.isEmpty ? nil : $0 } : nil
    let intervalMinutes = merged.intervalMinutes ?? WidgetServerUpdateDefaults.defaultIntervalMinutes

    return ResolvedWidgetServerSettings(
      url: url,
      intervalMinutes: intervalFromConfig
        ? intervalMinutes
        : WidgetServerUpdateDefaults.clampIntervalMinutes(intervalMinutes),
      enabled: serverDriven && (merged.enabled ?? true),
      method: merged.method ?? WidgetServerUpdateDefaults.defaultMethod,
      query: merged.query ?? [:],
      headers: merged.headers ?? [:],
      body: merged.body
    )
  }

  /// True when app.json marked this widget server-driven. The engine is chosen at generate time,
  /// so a runtime URL cannot make a widget server-driven and `setWidgetServerUpdate` rejects
  /// settings for one that is not.
  public func isServerDriven(_ scope: WidgetScope) -> Bool {
    layers.contains { $0.isServerDriven(scope) }
  }

  /// Monotonic counter of settings changes. A fetcher records it before fetching and commits only
  /// if it is still current, so settings changed mid-flight cannot commit a response built from
  /// the old ones.
  ///
  /// It is one counter for the whole store rather than one per scope: a change to another widget
  /// can make an in-flight fetch drop its result, and the reload that every `set` queues fetches
  /// again, so the cost is one wasted request in a rare race.
  public func revision(_: WidgetScope) -> Int {
    revisionSource()
  }

  static func merge(
    lower: WidgetServerUpdateSettings,
    higher: WidgetServerUpdateSettings
  ) -> WidgetServerUpdateSettings {
    WidgetServerUpdateSettings(
      url: higher.url ?? lower.url,
      intervalMinutes: higher.intervalMinutes ?? lower.intervalMinutes,
      enabled: higher.enabled ?? lower.enabled,
      method: higher.method ?? lower.method,
      query: mergePerKey(lower.query, higher.query),
      headers: mergePerKey(lower.headers, higher.headers),
      body: higher.body ?? lower.body
    )
  }

  private static func mergePerKey(
    _ lower: [String: String]?,
    _ higher: [String: String]?
  ) -> [String: String]? {
    guard let lower else { return higher }
    guard let higher else { return lower }

    return lower.merging(higher) { _, fromHigher in fromHigher }
  }
}
