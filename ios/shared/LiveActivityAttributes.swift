//
//  LiveActivityAttributes.swift
//  ExpoLiveActivity
//
//  Created by Anna Olak on 03/06/2025.
//

import ActivityKit
import Foundation

public struct VoltraUIAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var uiJsonData: String
    public let regions: [VoltraUIRegion: [VoltraUIComponent]]

    private enum CodingKeys: String, CodingKey {
      case uiJsonData
    }

    public init(uiJsonData: String) {
      self.uiJsonData = uiJsonData
      self.regions = ContentState.parseRegions(from: uiJsonData)
    }

    private static func parseRegions(from jsonString: String) -> [VoltraUIRegion: [VoltraUIComponent]] {
      var regions: [VoltraUIRegion: [VoltraUIComponent]] = [:]

      guard let data = jsonString.data(using: .utf8),
            let root = try? JSONSerialization.jsonObject(with: data) else {
        return regions
      }

      // If it's already an array, use it for all regions
      if root is [Any] {
        if let components = parseComponents(from: jsonString) {
          for region in VoltraUIRegion.allCases {
            regions[region] = components
          }
        }
        return regions
      }

      guard let dict = root as? [String: Any] else {
        return regions
      }

      // Extract components for each region with fallbacks
      for region in VoltraUIRegion.allCases {
        if let jsonString = selectJsonString(from: dict, region: region),
           let components = parseComponents(from: jsonString) {
          regions[region] = components
        }
      }

      return regions
    }

    private static func parseComponents(from jsonString: String) -> [VoltraUIComponent]? {
      guard let data = jsonString.data(using: .utf8) else { return nil }
      return try? JSONDecoder().decode([VoltraUIComponent].self, from: data)
    }

    private static func selectJsonString(from dict: [String: Any], region: VoltraUIRegion) -> String? {
      func tryPaths(_ paths: [[String]]) -> String? {
        for path in paths {
          if let fragment = extract(dict, path: path),
             let arrayString = fragmentToArrayString(fragment) {
            return arrayString
          }
        }
        return nil
      }

      let lockScreenPath: [String] = ["lockScreen"]
      let expandedUnified: [String] = ["island", "expanded"]
      let compactUnified: [String] = ["island", "compact"]
      let compactLeadingUnified: [String] = ["island", "compactLeading"]
      let compactTrailingUnified: [String] = ["island", "compactTrailing"]
      let minimalUnified: [String] = ["island", "minimal"]

      var selected: String? = {
        switch region {
        case .lockScreen:
          return tryPaths([lockScreenPath, expandedUnified])
        case .islandExpandedCenter:
          return tryPaths([expandedUnified, lockScreenPath])
        case .islandExpandedLeading:
          return nil
        case .islandExpandedTrailing:
          return nil
        case .islandExpandedBottom:
          return nil
        case .islandCompactLeading:
          return tryPaths([compactLeadingUnified, compactUnified, minimalUnified, expandedUnified, lockScreenPath])
        case .islandCompactTrailing:
          return tryPaths([compactTrailingUnified, minimalUnified]) ?? "[]"
        case .islandMinimal:
          return tryPaths([minimalUnified, compactUnified, expandedUnified, lockScreenPath])
        }
      }()

      if selected != nil, region == .islandExpandedCenter {
        if let data = selected!.data(using: .utf8),
           let arr = try? JSONSerialization.jsonObject(with: data) as? [Any], arr.isEmpty {
          selected = tryPaths([lockScreenPath])
        }
      }

      return selected
    }

    private static func extract(_ root: [String: Any], path: [String]) -> Any? {
      var cursor: Any? = root
      for key in path {
        guard let dict = cursor as? [String: Any] else { return nil }
        cursor = dict[key]
      }
      return cursor
    }

    private static func fragmentToArrayString(_ fragment: Any) -> String? {
      if let arr = fragment as? [Any], JSONSerialization.isValidJSONObject(arr) {
        guard let data = try? JSONSerialization.data(withJSONObject: arr),
              let string = String(data: data, encoding: .utf8) else { return nil }
        return string
      }
      if let dict = fragment as? [String: Any] {
        guard let type = dict["type"] as? String, !type.isEmpty else { return nil }
        if JSONSerialization.isValidJSONObject([dict]) {
          guard let data = try? JSONSerialization.data(withJSONObject: [dict]),
                let string = String(data: data, encoding: .utf8) else { return nil }
          return string
        }
      }
      return nil
    }

    public init(from decoder: Decoder) throws {
      let container = try decoder.container(keyedBy: CodingKeys.self)
      uiJsonData = try container.decode(String.self, forKey: .uiJsonData)
      regions = ContentState.parseRegions(from: uiJsonData)
    }
  }

  var name: String
  var deepLinkUrl: String?
}
