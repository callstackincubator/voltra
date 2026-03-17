import Foundation

/// Numeric thresholds and configuration values used across Voltra targets
public enum VoltraConstants {
  public static let maxPayloadSizeBytes = 4096
  public static let compressedPayloadSafeBudget = 3345
  public static let widgetJsonWarningSizeBytes = 50000
  public static let timelineWarningSizeBytes = 100_000
}

/// All UserDefaults keys and Info.plist key names used across Voltra targets
public enum VoltraStorageKeys {
  // MARK: - UserDefaults keys (shared: app + widget targets)

  public static func widgetJson(_ widgetId: String) -> String {
    "Voltra_Widget_JSON_\(widgetId)"
  }

  public static func widgetDeepLinkUrl(_ widgetId: String) -> String {
    "Voltra_Widget_DeepLinkURL_\(widgetId)"
  }

  public static func widgetTimeline(_ widgetId: String) -> String {
    "Voltra_Widget_Timeline_\(widgetId)"
  }

  public static func widgetServerUrl(_ widgetId: String) -> String {
    "Voltra_Widget_ServerUrl_\(widgetId)"
  }

  // MARK: - Prefixes / kind identifiers

  public static let widgetKindPrefix = "Voltra_Widget_"

  // MARK: - Info.plist keys

  public static let widgetIds = "Voltra_WidgetIds"
  public static let enablePushNotifications = "Voltra_EnablePushNotifications"
  public static let widgetServerUrls = "Voltra_WidgetServerUrls"
  public static let widgetServerIntervals = "Voltra_WidgetServerIntervals"
  public static let appGroupIdentifier = "Voltra_AppGroupIdentifier"
  public static let legacyAppGroupIdentifier = "AppGroupIdentifier"
  public static let keychainGroup = "Voltra_KeychainGroup"
}
