import Foundation
import os

/// Errors that can occur during widget persistence operations.
public enum WidgetError: Error, LocalizedError {
  case appGroupNotConfigured
  case userDefaultsUnavailable

  public var errorDescription: String? {
    switch self {
    case .appGroupNotConfigured:
      return "App Group not configured. Set 'groupIdentifier' in the Voltra config plugin to use widgets."
    case .userDefaultsUnavailable:
      return "Unable to access UserDefaults for the app group."
    }
  }
}

/// Low-level UserDefaults CRUD for widget keys.
/// Shared between the app target (write/clear) and the widget extension target (read).
///
/// Write methods throw `WidgetError` to surface configuration problems to the caller.
/// Read and remove methods are non-throwing: they return nil / no-op when the app group
/// is not configured, since the widget extension has no way to propagate errors.
public enum VoltraWidgetDefaults {
  // MARK: - Read

  public static func widgetJson(for widgetId: String) -> String? {
    try? resolvedDefaults().string(forKey: VoltraStorageKeys.widgetJson(widgetId))
  }

  public static func deepLinkUrl(for widgetId: String) -> String? {
    try? resolvedDefaults().string(forKey: VoltraStorageKeys.widgetDeepLinkUrl(widgetId))
  }

  public static func timelineString(for widgetId: String) -> String? {
    try? resolvedDefaults().string(forKey: VoltraStorageKeys.widgetTimeline(widgetId))
  }

  // MARK: - Write

  public static func setWidgetJson(_ json: String, for widgetId: String, deepLinkUrl: String?) throws {
    let defaults = try resolvedDefaults()

    let dataSize = json.utf8.count
    if dataSize > VoltraConstants.widgetJsonWarningSizeBytes {
      VoltraLogger.storage.warning("Large widget payload for '\(widgetId)': \(dataSize) bytes (threshold: \(VoltraConstants.widgetJsonWarningSizeBytes) bytes)")
    }

    defaults.set(json, forKey: VoltraStorageKeys.widgetJson(widgetId))

    if let url = deepLinkUrl, !url.isEmpty {
      defaults.set(url, forKey: VoltraStorageKeys.widgetDeepLinkUrl(widgetId))
    } else {
      defaults.removeObject(forKey: VoltraStorageKeys.widgetDeepLinkUrl(widgetId))
    }

    defaults.synchronize()
  }

  public static func setTimeline(_ timeline: String, for widgetId: String) throws {
    let defaults = try resolvedDefaults()

    let dataSize = timeline.utf8.count
    if dataSize > VoltraConstants.timelineWarningSizeBytes {
      VoltraLogger.storage.warning("Large timeline for '\(widgetId)': \(dataSize) bytes (threshold: \(VoltraConstants.timelineWarningSizeBytes) bytes)")
    }

    defaults.set(timeline, forKey: VoltraStorageKeys.widgetTimeline(widgetId))
    defaults.synchronize()
  }

  // MARK: - Remove

  /// Removes all persisted data (json, deepLinkUrl, timeline) for a single widget.
  /// This is the single source of truth for which keys exist per widget.
  public static func removeAllData(for widgetId: String) {
    guard let defaults = try? resolvedDefaults() else { return }
    defaults.removeObject(forKey: VoltraStorageKeys.widgetJson(widgetId))
    defaults.removeObject(forKey: VoltraStorageKeys.widgetDeepLinkUrl(widgetId))
    defaults.removeObject(forKey: VoltraStorageKeys.widgetTimeline(widgetId))
    defaults.synchronize()
  }

  public static func removeTimeline(for widgetId: String) {
    guard let defaults = try? resolvedDefaults() else { return }
    defaults.removeObject(forKey: VoltraStorageKeys.widgetTimeline(widgetId))
    defaults.synchronize()
  }

  /// Removes all persisted data for every widget listed in the app's Info.plist.
  public static func removeAllWidgets() {
    guard let defaults = try? resolvedDefaults() else { return }
    let widgetIds = Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.widgetIds) as? [String] ?? []
    for widgetId in widgetIds {
      defaults.removeObject(forKey: VoltraStorageKeys.widgetJson(widgetId))
      defaults.removeObject(forKey: VoltraStorageKeys.widgetDeepLinkUrl(widgetId))
      defaults.removeObject(forKey: VoltraStorageKeys.widgetTimeline(widgetId))
    }
    defaults.synchronize()
  }

  // MARK: - Private

  private static func resolvedDefaults() throws -> UserDefaults {
    guard let groupId = VoltraConfig.groupIdentifier() else {
      throw WidgetError.appGroupNotConfigured
    }
    guard let defaults = UserDefaults(suiteName: groupId) else {
      throw WidgetError.userDefaultsUnavailable
    }
    return defaults
  }
}
