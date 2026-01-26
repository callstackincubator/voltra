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
      if raw.contains("://"), let url = URL(string: raw) { return url }
      if let scheme = deepLinkScheme() {
        let path = raw.hasPrefix("/") ? raw : "/\(raw)"
        return URL(string: "\(scheme)://\(path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))")
      }
    }
    return nil
  }
}
