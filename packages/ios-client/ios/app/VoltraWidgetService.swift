import Foundation
import os
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
    VoltraLogger.widget.info("Widget data stored for '\(widgetId)'")
  }

  static func setTimeline(widgetId: String, timelineJson: String) throws {
    try VoltraWidgetDefaults.setTimeline(timelineJson, for: widgetId)
    VoltraLogger.widget.info("Timeline stored for '\(widgetId)'")
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
    VoltraLogger.widget.info("Reloaded timeline for '\(widgetId)'")
  }

  static func reloadAllTimelines() {
    WidgetCenter.shared.reloadAllTimelines()
    VoltraLogger.widget.info("Reloaded all timelines")
  }

  // MARK: - Server update settings

  /// Applies runtime server-update settings and reloads the widgets they affect.
  ///
  /// Storing is only half of what an app expects from `setWidgetServerUpdate`: a new URL should be
  /// fetched from now on, and `enabled: false` should take effect without waiting out the current
  /// interval. A reload makes the affected timelines re-resolve their settings straight away.
  ///
  /// - Parameter widgetId: the widget to scope the settings to, or nil for every server-driven one.
  /// - Returns: an error message, or nil when the settings were applied.
  static func setWidgetServerUpdate(settingsJson: String, widgetId: String?) -> String? {
    let settings: WidgetServerUpdateSettings

    switch WidgetServerUpdateSettingsJson.parse(settingsJson) {
    case let .invalid(reason):
      return reason
    case let .parsed(parsed):
      settings = parsed
    }

    if let widgetId, let error = rejectIfNotServerDriven(widgetId) {
      return error
    }

    if let error = WidgetServerSettingsValidator.validate(settings, isDebugBuild: VoltraWidgetServer.isDebugBuild) {
      return error
    }

    WidgetServerSettingsStore.set(settings, scope: widgetId.map { .of($0) })
    reloadServerDrivenWidgets(widgetId: widgetId)

    return nil
  }

  /// Drops the runtime settings for one widget, or the global ones, so the widget falls back to
  /// what app.json configured. Clearing the global settings is the logout gesture.
  static func clearWidgetServerUpdate(widgetId: String?) -> String? {
    if let widgetId, let error = rejectIfNotServerDriven(widgetId) {
      return error
    }

    WidgetServerSettingsStore.clear(scope: widgetId.map { .of($0) })
    reloadServerDrivenWidgets(widgetId: widgetId)

    return nil
  }

  /// The engine is chosen at generate time, so a runtime URL cannot turn a locally-driven widget
  /// into a server-driven one. Saying so at call time is much easier to act on than a widget that
  /// quietly never fetches.
  private static func rejectIfNotServerDriven(_ widgetId: String) -> String? {
    guard !VoltraWidgetServer.isServerDriven(widgetId) else { return nil }

    return "Widget '\(widgetId)' is not server-driven. Add a serverUpdate entry for it in app.json "
      + "and rebuild; a runtime url does not change how a widget is rendered."
  }

  private static func reloadServerDrivenWidgets(widgetId: String?) {
    guard let widgetId else {
      for id in VoltraWidgetServer.serverDrivenWidgetIds {
        reloadTimeline(for: id)
      }
      return
    }

    reloadTimeline(for: widgetId)
  }

  /// Drops one widget's runtime settings and its fetch history, for `clearWidget`.
  static func clearWidgetServerState(for widgetId: String) {
    guard VoltraWidgetServer.isServerDriven(widgetId) else { return }

    let scope = WidgetScope.of(widgetId)

    WidgetServerSettingsStore.clear(scope: scope)
    WidgetServerEtagStore.clear(scope)
    DynamicWidgetServerPropsStore().clear(scope)
  }

  // MARK: - Server credentials (deprecated)

  /// Saves widget server credentials to the Keychain and reloads all widget timelines
  /// so extensions can use them on the next fetch.
  ///
  /// Deprecated in favour of `setWidgetServerUpdate` with an `Authorization` header. Kept as a
  /// wrapper over the same Keychain accounts, so an app that has not migrated keeps working and
  /// nothing has to be moved on device.
  static func setWidgetServerCredentials(token: String, headers: [String: String]?) {
    VoltraKeychainHelper.saveToken(token)
    if let headers = headers {
      VoltraKeychainHelper.saveHeaders(headers)
    } else {
      VoltraKeychainHelper.deleteHeaders()
    }
    // The credentials layer does not go through the settings store, but a new token is exactly the
    // thing a widget stuck on a 401 is waiting for, so an in-flight fetch built with the old one
    // must not commit.
    WidgetServerSettingsStore.bumpRevision()
    VoltraLogger.widget.info("Server credentials saved")
    reloadAllTimelines()
  }

  /// Clears widget server credentials from the Keychain and reloads all widget timelines.
  ///
  /// Deprecated alongside `setWidgetServerCredentials`.
  static func clearWidgetServerCredentials() {
    VoltraKeychainHelper.clearAll()
    WidgetServerSettingsStore.bumpRevision()
    VoltraLogger.widget.info("Server credentials cleared")
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
        VoltraLogger.widget.info("Cleaned up orphaned data for '\(widgetId)'")
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
