import ActivityKit
import Foundation
import SwiftUI

enum VoltraDeepLinkResolver {
  static func deepLinkScheme() -> String? {
    if let types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] {
      for t in types {
        if let schemes = t["CFBundleURLSchemes"] as? [String], let s = schemes.first, !s.isEmpty {
          return s
        }
      }
    }
    return Bundle.main.bundleIdentifier
  }

  static func resolve(
    _ attributes: VoltraAttributes
  ) -> URL? {
    if let raw = attributes.deepLinkUrl, !raw.isEmpty {
      return resolveUrl(raw)
    }
    return nil
  }

  /// Resolves a URL string, supporting both absolute and relative paths
  /// - Parameter raw: The URL string (e.g., "myapp://path", "/path", or "path")
  /// - Returns: A resolved URL, or nil if invalid
  static func resolveUrl(_ raw: String) -> URL? {
    guard !raw.isEmpty else { return nil }

    // If it's already an absolute URL, use it as-is
    if raw.contains("://"), let url = URL(string: raw) { return url }

    // Otherwise, prepend the app's URL scheme
    if let scheme = deepLinkScheme() {
      let path = raw.hasPrefix("/") ? raw : "/\(raw)"
      return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
    }

    return nil
  }
}
