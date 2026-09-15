import Foundation

/// Shared configuration utilities for Voltra
/// Centralizes access to App Group identifiers and other configuration
public enum VoltraConfig {
  /// Get the App Group identifier from Info.plist
  /// Checks both `Voltra_AppGroupIdentifier` and legacy `AppGroupIdentifier` keys
  public static func groupIdentifier() -> String? {
    Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.appGroupIdentifier) as? String
      ?? Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.legacyAppGroupIdentifier) as? String
  }

  /// Get the Keychain Access Group from Info.plist
  /// Used for sharing credentials between the main app and widget extension
  public static func keychainGroup() -> String? {
    Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.keychainGroup) as? String
  }

  /// Reported when `Voltra_Version` is missing or unusable, mirroring the `appVersion` fallback.
  public static let unknownVoltraVersion = "unknown"

  /// Get the installed Voltra client package version from Info.plist
  /// Written at prebuild (`expo prebuild`) or apply (`voltra apply`) time from the installed
  /// `@use-voltra/{ios,android}-client` manifest, and surfaced to widgets as `env.build.voltraVersion`.
  public static func voltraVersion(bundle: Bundle = .main) -> String {
    normalizeVoltraVersion(bundle.object(forInfoDictionaryKey: VoltraStorageKeys.voltraVersion))
  }

  /// Value handling for `voltraVersion(bundle:)`, split out so every malformed shape the plist can
  /// hold is covered without building a bundle per case.
  static func normalizeVoltraVersion(_ rawValue: Any?) -> String {
    guard let version = rawValue as? String, !version.isEmpty else {
      return unknownVoltraVersion
    }

    return version
  }

  /// Get the `{ widgetId: kind }` map of widgets that pin a custom WidgetKit kind from Info.plist
  /// Written at prebuild (`expo prebuild`) or apply (`voltra apply`) time from the `kind` option.
  /// Absent when every widget keeps the default `Voltra_Widget_<id>` kind.
  public static func widgetKinds(bundle: Bundle = .main) -> [String: String] {
    normalizeWidgetKinds(bundle.object(forInfoDictionaryKey: VoltraStorageKeys.widgetKinds))
  }

  /// Value handling for `widgetKinds(bundle:)`, split out so every malformed shape the plist can
  /// hold is covered without building a bundle per case. Entries that are not non-empty strings
  /// are dropped, leaving those widgets on the default kind.
  static func normalizeWidgetKinds(_ rawValue: Any?) -> [String: String] {
    guard let rawMap = rawValue as? [String: Any] else {
      return [:]
    }

    return rawMap.compactMapValues { value in
      guard let kind = value as? String, !kind.isEmpty else { return nil }
      return kind
    }
  }
}
