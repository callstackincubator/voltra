import Foundation

/// Maps a widget id to its WidgetKit `kind` and back.
///
/// The kind defaults to `Voltra_Widget_<id>`. A widget can pin another kind through the plugin
/// `kind` option, stored in Info.plist under `Voltra_WidgetKinds` (app and extension), so widgets
/// placed before a migration to Voltra keep their identity.
public enum VoltraWidgetKind {
  private static var overrides: [String: String] {
    Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.widgetKinds) as? [String: String] ?? [:]
  }

  public static func kind(for widgetId: String) -> String {
    overrides[widgetId] ?? "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)"
  }

  /// Returns nil when the kind does not belong to a Voltra widget.
  public static func widgetId(for kind: String) -> String? {
    if let match = overrides.first(where: { $0.value == kind }) {
      return match.key
    }
    let prefix = VoltraStorageKeys.widgetKindPrefix
    guard kind.hasPrefix(prefix) else { return nil }
    return String(kind.dropFirst(prefix.count))
  }
}
