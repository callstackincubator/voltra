//
//  LiveActivityAttributes.swift
//  ExpoLiveActivity
//
//  Created by Anna Olak on 03/06/2025.
//

import ActivityKit
import Foundation

public struct VoltraAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var uiJsonData: String
    public let regions: [VoltraRegion: [VoltraComponent]]

    private enum CodingKeys: String, CodingKey {
      case uiJsonData
    }

    public init(uiJsonData: String) {
      self.uiJsonData = uiJsonData
      self.regions = ContentState.parseRegions(from: uiJsonData)
    }

    private static func parseRegions(from jsonString: String) -> [VoltraRegion: [VoltraComponent]] {
      var regions: [VoltraRegion: [VoltraComponent]] = [:]

      guard let data = jsonString.data(using: .utf8),
            let root = try? JSONSerialization.jsonObject(with: data) else {
        return regions
      }

      // If it's already an array, use it for all regions
      if root is [Any] {
        if let components = parseComponents(from: jsonString) {
          for region in VoltraRegion.allCases {
            regions[region] = components
          }
        }
        return regions
      }

      guard let dict = root as? [String: Any] else {
        return regions
      }

      // Extract components for each region
      for region in VoltraRegion.allCases {
        if let jsonString = selectJsonString(from: dict, region: region),
           let components = parseComponents(from: jsonString) {
          regions[region] = components
        }
      }

      return regions
    }

    private static func parseComponents(from jsonString: String) -> [VoltraComponent]? {
      guard let data = jsonString.data(using: .utf8) else { return nil }
      return try? JSONDecoder().decode([VoltraComponent].self, from: data)
    }

    private static func selectJsonString(from dict: [String: Any], region: VoltraRegion) -> String? {
      func tryKey(_ key: String) -> String? {
        if let fragment = dict[key],
           let arrayString = fragmentToArrayString(fragment) {
          return arrayString
        }
        return nil
      }

      let key: String
      switch region {
      case .lockScreen:
        key = "ls"
      case .islandExpandedCenter:
        key = "isl_exp_c"
      case .islandExpandedLeading:
        key = "isl_exp_l"
      case .islandExpandedTrailing:
        key = "isl_exp_t"
      case .islandExpandedBottom:
        key = "isl_exp_b"
      case .islandCompactLeading:
        key = "isl_cmp_l"
      case .islandCompactTrailing:
        key = "isl_cmp_t"
      case .islandMinimal:
        key = "isl_min"
      }

      return tryKey(key)
    }


    private static func fragmentToArrayString(_ fragment: Any) -> String? {
      if let arr = fragment as? [Any], JSONSerialization.isValidJSONObject(arr) {
        guard let data = try? JSONSerialization.data(withJSONObject: arr),
              let string = String(data: data, encoding: .utf8) else { return nil }
        return string
      }
      if let dict = fragment as? [String: Any] {
        guard let type = dict["t"] as? String, !type.isEmpty else { return nil }
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
