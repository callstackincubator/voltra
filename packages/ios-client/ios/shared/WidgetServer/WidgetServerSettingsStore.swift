import Foundation
import Security

/// The only way to write server-update settings, and the storage behind the three runtime layers.
///
/// Records live in the same shared Keychain the widget credentials have always used, so nothing
/// migrates: the deprecated `setWidgetServerCredentials` keeps writing the accounts it always did,
/// and this store adds its own accounts alongside them. The Keychain is also the only store both
/// the app and the widget extension can reach without depending on an App Group being configured.
///
/// Callers do not read through this class. They read through `WidgetServerSettingsResolver`, which
/// is what keeps the layer order and the merge rule in one place.
public enum WidgetServerSettingsStore {
  private static let service = "voltra-widget-server-credentials"
  private static let globalAccount = "server_update_global"
  private static let widgetAccountPrefix = "server_update_widget_"
  private static let revisionAccount = "server_update_revision"

  // MARK: - Writes

  /// Replaces the global layer, or one widget's layer when `scope` is given.
  @discardableResult
  public static func set(_ settings: WidgetServerUpdateSettings, scope: WidgetScope?) -> Bool {
    guard let data = WidgetServerSettingsCodec.encode(settings) else { return false }

    let saved = write(data, account: account(for: scope))
    bumpRevision()

    return saved
  }

  /// Empties the global layer, or one widget's layer when `scope` is given.
  public static func clear(scope: WidgetScope?) {
    delete(account: account(for: scope))
    bumpRevision()
  }

  /// Bumps the revision without changing a layer. The credentials layer writes through the
  /// deprecated credential API, which does not go through `set`, so it calls this to make sure an
  /// in-flight fetch built with the old token does not commit.
  public static func bumpRevision() {
    let next = revision() &+ 1
    write(Data("\(next)".utf8), account: revisionAccount)
  }

  public static func revision() -> Int {
    guard let data = read(account: revisionAccount),
          let text = String(data: data, encoding: .utf8),
          let value = Int(text)
    else {
      return 0
    }

    return value
  }

  // MARK: - Reads

  static func settings(scope: WidgetScope?) -> WidgetServerUpdateSettings? {
    WidgetServerSettingsCodec.decode(read(account: account(for: scope)))
  }

  private static func account(for scope: WidgetScope?) -> String {
    guard let scope else { return globalAccount }

    return "\(widgetAccountPrefix)\(scope.storageKey)"
  }

  // MARK: - Keychain

  private static func baseQuery(account: String) -> [String: Any] {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]

    if let group = VoltraConfig.keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    return query
  }

  @discardableResult
  private static func write(_ data: Data, account: String) -> Bool {
    delete(account: account)

    var query = baseQuery(account: account)
    query[kSecValueData as String] = data
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock

    let status = SecItemAdd(query as CFDictionary, nil)

    if status != errSecSuccess {
      VoltraLogger.keychain.error("Failed to save widget server settings: \(status, privacy: .public)")
    }

    return status == errSecSuccess
  }

  private static func read(account: String) -> Data? {
    var query = baseQuery(account: account)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess, let data = item as? Data else {
      if status != errSecItemNotFound {
        VoltraLogger.keychain.error("Failed to read widget server settings: \(status, privacy: .public)")
      }
      return nil
    }

    return data
  }

  private static func delete(account: String) {
    SecItemDelete(baseQuery(account: account) as CFDictionary)
  }
}

/// Settings the app set for every server-driven widget.
struct GlobalWidgetServerSettingsLayer: WidgetServerSettingsLayer {
  let name = "global"

  func settings(for _: WidgetScope) -> WidgetServerUpdateSettings? {
    WidgetServerSettingsStore.settings(scope: nil)
  }
}

/// Settings the app set for one widget. Highest layer until instance scopes arrive.
struct WidgetWidgetServerSettingsLayer: WidgetServerSettingsLayer {
  let name = "widget"

  func settings(for scope: WidgetScope) -> WidgetServerUpdateSettings? {
    WidgetServerSettingsStore.settings(scope: scope)
  }
}

/// The deprecated `setWidgetServerCredentials` API, expressed as a settings layer.
///
/// It reads the same token and header records it always has, which is why nothing migrates. It
/// sits below the global layer so an app that has moved to
/// `setWidgetServerUpdate({ headers: { Authorization: ... } })` overrides whatever an older call
/// left behind, rather than the other way round.
struct CredentialsWidgetServerSettingsLayer: WidgetServerSettingsLayer {
  let name = "credentials"

  func settings(for _: WidgetScope) -> WidgetServerUpdateSettings? {
    var headers: [String: String] = [:]

    if let token = VoltraKeychainHelper.readToken(), !token.isEmpty {
      headers["Authorization"] = "Bearer \(token)"
    }

    if let custom = VoltraKeychainHelper.readHeaders() {
      headers.merge(custom) { _, fromCustom in fromCustom }
    }

    return headers.isEmpty ? nil : WidgetServerUpdateSettings(headers: headers)
  }
}
