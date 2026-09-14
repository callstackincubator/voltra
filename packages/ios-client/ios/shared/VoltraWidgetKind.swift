import Foundation

/// Maps a widget id to its WidgetKit `kind` and back.
///
/// The kind defaults to `Voltra_Widget_<id>`. A widget can pin another kind through the plugin
/// `kind` option, stored in Info.plist under `Voltra_WidgetKinds` (app and extension), so widgets
/// placed before a migration to Voltra keep their identity.
///
/// This is the only place either half of that mapping is derived; nothing else should reach for
/// `VoltraStorageKeys.widgetKindPrefix`.
public enum VoltraWidgetKind {
  /// Info.plist cannot change for the life of the process, so the map is read once.
  private static let mainOverrides = VoltraConfig.widgetKinds()

  public static func kind(for widgetId: String) -> String {
    kind(for: widgetId, overrides: mainOverrides)
  }

  /// Returns nil when the kind does not belong to a Voltra widget.
  public static func widgetId(for kind: String) -> String? {
    widgetId(for: kind, overrides: mainOverrides)
  }

  /// Pure half of `kind(for:)`, split out so the mapping is covered without building a bundle.
  static func kind(for widgetId: String, overrides: [String: String]) -> String {
    overrides[widgetId] ?? "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)"
  }

  /// Pure half of `widgetId(for:)`. Overrides win over the prefix so a widget that pins a kind
  /// shaped like another widget's default still resolves to its own id.
  static func widgetId(for kind: String, overrides: [String: String]) -> String? {
    if let match = overrides.first(where: { $0.value == kind }) {
      return match.key
    }

    let prefix = VoltraStorageKeys.widgetKindPrefix
    guard kind.hasPrefix(prefix) else { return nil }

    return String(kind.dropFirst(prefix.count))
  }
}
