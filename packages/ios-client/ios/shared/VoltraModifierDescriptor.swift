import Foundation
import os

/// One entry of a component's `modifiers` prop: `{ "$type": "<name>", ...params }` (ADR 0005).
///
/// Decoding lives next to `VoltraElement`, which decodes the prop once while parsing; building
/// the SwiftUI modifier is the job of `VoltraModifierRegistry` in `ui/Modifiers`.
public struct VoltraModifierDescriptor {
  public let type: String
  public let params: [String: Any]

  public init(type: String, params: [String: Any]) {
    self.type = type
    self.params = params
  }

  private static let logger = Logger(subsystem: "com.voltra", category: "modifier")

  /// Decodes the JSON-encoded `modifiers` prop. Entries without a string `$type` are dropped.
  public static func parseList(_ json: String?) -> [VoltraModifierDescriptor] {
    guard let json, let data = json.data(using: .utf8) else { return [] }
    guard let entries = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else {
      logger.warning("Ignoring modifiers that are not a JSON array of objects")
      return []
    }
    return entries.compactMap { entry in
      guard let type = entry["$type"] as? String else { return nil }
      var params = entry
      params.removeValue(forKey: "$type")
      return VoltraModifierDescriptor(type: type, params: params)
    }
  }
}
