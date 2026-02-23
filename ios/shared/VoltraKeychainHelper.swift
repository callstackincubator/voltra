import Foundation
import Security

/// Shared Keychain helper for securely storing and reading widget server credentials.
/// Used by both the main app (to write credentials) and the widget extension (to read them).
public enum VoltraKeychainHelper {
  /// Keychain service identifier for Voltra widget credentials
  private static let service = "voltra-widget-server-credentials"

  /// Key for the auth token
  private static let tokenKey = "auth_token"

  /// Key for additional headers (stored as JSON)
  private static let headersKey = "custom_headers"

  /// Get the Keychain Access Group from Info.plist (set by the config plugin)
  private static func keychainGroup() -> String? {
    VoltraConfig.keychainGroup()
  }

  // MARK: - Token Storage

  /// Save an auth token to the shared Keychain.
  /// Called from the main app after user login.
  @discardableResult
  public static func saveToken(_ token: String) -> Bool {
    guard let data = token.data(using: .utf8) else { return false }

    // Delete existing token first
    deleteToken()

    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: tokenKey,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]

    // Add access group if configured (for sharing between app and extension)
    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    let status = SecItemAdd(query as CFDictionary, nil)
    if status != errSecSuccess {
      print("[Voltra] Failed to save token to Keychain: \(status)")
    }
    return status == errSecSuccess
  }

  /// Read the auth token from the shared Keychain.
  /// Called from the widget extension's TimelineProvider.
  public static func readToken() -> String? {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: tokenKey,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess, let data = item as? Data else {
      if status != errSecItemNotFound {
        print("[Voltra] Failed to read token from Keychain: \(status)")
      }
      return nil
    }

    return String(data: data, encoding: .utf8)
  }

  /// Delete the auth token from the shared Keychain.
  @discardableResult
  public static func deleteToken() -> Bool {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: tokenKey,
    ]

    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    let status = SecItemDelete(query as CFDictionary)
    return status == errSecSuccess || status == errSecItemNotFound
  }

  // MARK: - Custom Headers Storage

  /// Save additional custom headers to the shared Keychain.
  @discardableResult
  public static func saveHeaders(_ headers: [String: String]) -> Bool {
    guard let data = try? JSONSerialization.data(withJSONObject: headers) else { return false }

    // Delete existing headers first
    deleteHeaders()

    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: headersKey,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]

    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    let status = SecItemAdd(query as CFDictionary, nil)
    if status != errSecSuccess {
      print("[Voltra] Failed to save headers to Keychain: \(status)")
    }
    return status == errSecSuccess
  }

  /// Read custom headers from the shared Keychain.
  public static func readHeaders() -> [String: String]? {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: headersKey,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)

    guard status == errSecSuccess,
          let data = item as? Data,
          let headers = try? JSONSerialization.jsonObject(with: data) as? [String: String]
    else {
      return nil
    }

    return headers
  }

  /// Delete custom headers from the shared Keychain.
  @discardableResult
  public static func deleteHeaders() -> Bool {
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: headersKey,
    ]

    if let group = keychainGroup() {
      query[kSecAttrAccessGroup as String] = group
    }

    let status = SecItemDelete(query as CFDictionary)
    return status == errSecSuccess || status == errSecItemNotFound
  }

  // MARK: - Convenience

  /// Clear all Voltra widget server credentials from the Keychain.
  public static func clearAll() {
    deleteToken()
    deleteHeaders()
  }
}
