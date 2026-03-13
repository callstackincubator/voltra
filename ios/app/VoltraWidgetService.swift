import Foundation
import WidgetKit

/// App-side facade for all widget operations.
///
/// Delegates persistence to `VoltraWidgetDefaults` and system reload notifications
/// to `WidgetCenter`, so callers have a single collaborator and the storage layer
/// can be swapped without touching orchestration code.
///
/// Note: `VoltraWidgetDefaults` intentionally remains in `ios/shared/` because the
/// widget extension target reads from it directly — this service is app-target only.
enum VoltraWidgetService {

  // MARK: - Storage (write)

  static func setWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) throws {
    try VoltraWidgetDefaults.setWidgetJson(jsonString, for: widgetId, deepLinkUrl: deepLinkUrl)
  }

  static func setTimeline(widgetId: String, timelineJson: String) throws {
    try VoltraWidgetDefaults.setTimeline(timelineJson, for: widgetId)
    print("[Voltra] Timeline stored successfully for '\(widgetId)'")
  }

  // MARK: - Storage (remove)

  static func removeAllData(for widgetId: String) {
    VoltraWidgetDefaults.removeAllData(for: widgetId)
  }

  static func removeTimeline(for widgetId: String) {
    VoltraWidgetDefaults.removeTimeline(for: widgetId)
  }

  static func removeAllWidgets() {
    VoltraWidgetDefaults.removeAllWidgets()
  }

  // MARK: - Reload

  static func reloadTimeline(for widgetId: String) {
    WidgetCenter.shared.reloadTimelines(ofKind: "\(VoltraStorageKeys.widgetKindPrefix)\(widgetId)")
  }

  static func reloadAllTimelines() {
    WidgetCenter.shared.reloadAllTimelines()
  }

  // MARK: - Server credentials

  /// Saves widget server credentials to the Keychain and reloads all widget timelines
  /// so extensions can use them on the next fetch.
  static func setWidgetServerCredentials(token: String, headers: [String: String]?) {
    VoltraKeychainHelper.saveToken(token)
    if let headers = headers {
      VoltraKeychainHelper.saveHeaders(headers)
    } else {
      VoltraKeychainHelper.deleteHeaders()
    }
    print("[Voltra] Widget server credentials saved to Keychain")
    reloadAllTimelines()
  }

  /// Clears widget server credentials from the Keychain and reloads all widget timelines.
  static func clearWidgetServerCredentials() {
    VoltraKeychainHelper.clearAll()
    print("[Voltra] Widget server credentials cleared from Keychain")
    reloadAllTimelines()
  }

  // MARK: - Query

  /// Returns active widgets as dictionaries with `name`, `kind`, and `family` keys.
  static func getActiveWidgets() async throws -> [[String: String]] {
    try await withCheckedThrowingContinuation { continuation in
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case let .success(widgetInfos):
          let mapped = widgetInfos.map { widget -> [String: String] in
            let prefix = VoltraStorageKeys.widgetKindPrefix
            let name = widget.kind.hasPrefix(prefix)
              ? String(widget.kind.dropFirst(prefix.count))
              : widget.kind

            return [
              "name": name,
              "kind": widget.kind,
              "family": mapWidgetFamily(widget.family),
            ]
          }
          continuation.resume(returning: mapped)
        case let .failure(error):
          continuation.resume(throwing: error)
        }
      }
    }
  }

  /// Returns the set of widget IDs currently installed on the device.
  /// Only IDs whose kind carries the Voltra prefix are included.
  static func getInstalledWidgetIds() async throws -> Set<String> {
    try await withCheckedThrowingContinuation { continuation in
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case let .success(configs):
          let ids = Set(configs.compactMap { config -> String? in
            let prefix = VoltraStorageKeys.widgetKindPrefix
            guard config.kind.hasPrefix(prefix) else { return nil }
            return String(config.kind.dropFirst(prefix.count))
          })
          continuation.resume(returning: ids)
        case let .failure(error):
          continuation.resume(throwing: error)
        }
      }
    }
  }

  // MARK: - Maintenance

  /// Removes persisted data for any widget that is known to the app but no longer
  /// installed on the device. Safe to call fire-and-forget from app startup.
  static func cleanupOrphanedData() {
    let knownWidgetIds = Bundle.main.object(forInfoDictionaryKey: VoltraStorageKeys.widgetIds) as? [String] ?? []
    guard !knownWidgetIds.isEmpty else { return }

    Task {
      guard let installedIds = try? await getInstalledWidgetIds() else { return }

      for widgetId in knownWidgetIds where !installedIds.contains(widgetId) {
        VoltraWidgetDefaults.removeAllData(for: widgetId)
        print("[Voltra] Cleaned up orphaned widget data for '\(widgetId)'")
      }
    }
  }

  // MARK: - Private helpers

  private static func mapWidgetFamily(_ family: WidgetFamily) -> String {
    switch family {
    case .systemSmall: return "systemSmall"
    case .systemMedium: return "systemMedium"
    case .systemLarge: return "systemLarge"
    case .systemExtraLarge: return "systemExtraLarge"
    case .accessoryCircular: return "accessoryCircular"
    case .accessoryRectangular: return "accessoryRectangular"
    case .accessoryInline: return "accessoryInline"
    @unknown default: return "unknown"
    }
  }
}
