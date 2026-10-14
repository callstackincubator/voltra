import ActivityKit
import Foundation
import SwiftUI

extension VoltraDeepLinkResolver {
  static func resolve(
    _ attributes: VoltraAttributes
  ) -> URL? {
    if let raw = attributes.deepLinkUrl, !raw.isEmpty {
      return resolveUrl(raw)
    }
    return nil
  }
}
