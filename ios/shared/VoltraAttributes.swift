import ActivityKit
import Compression
import Foundation

public enum ContentStateParsingError: Error {
  case invalidJsonString
  case jsonDeserializationFailed(Error)
  case invalidRootType
  case componentsParsingFailed(Error)
  case regionParsingFailed(VoltraRegion, Error)
}

public struct VoltraAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    public var uiJsonData: String
    public let regions: [VoltraRegion: [VoltraComponent]]
    public let keylineTint: String?
    public let activityBackgroundTint: String?

    private enum CodingKeys: String, CodingKey {
      case uiJsonData
    }

    public init(uiJsonData: String) throws {
      self.uiJsonData = uiJsonData

      let decompressedJson = try BrotliCompression.decompress(base64String: uiJsonData)
      let parsedData = try ContentState.parseJsonData(from: decompressedJson)
      self.regions = parsedData.regions
      self.keylineTint = parsedData.keylineTint
      self.activityBackgroundTint = parsedData.activityBackgroundTint
    }

    private struct ParsedJsonData {
      let regions: [VoltraRegion: [VoltraComponent]]
      let keylineTint: String?
      let activityBackgroundTint: String?
    }

    private static func parseJsonData(from jsonString: String) throws -> ParsedJsonData {
      var regions: [VoltraRegion: [VoltraComponent]] = [:]
      var keylineTint: String? = nil
      var activityBackgroundTint: String? = nil

      guard let data = jsonString.data(using: .utf8) else {
        throw ContentStateParsingError.invalidJsonString
      }

      let root: Any
      do {
        root = try JSONSerialization.jsonObject(with: data)
      } catch {
        throw ContentStateParsingError.jsonDeserializationFailed(error)
      }

      // If it's already an array, use it for all regions
      if root is [Any] {
        let components = try parseComponents(from: jsonString)
        for region in VoltraRegion.allCases {
          regions[region] = components
        }
        return ParsedJsonData(regions: regions, keylineTint: nil, activityBackgroundTint: nil)
      }

      guard let dict = root as? [String: Any] else {
        throw ContentStateParsingError.invalidRootType
      }

      // Extract keylineTint
      if let keylineTintValue = dict["isl_keyline_tint"] as? String {
        keylineTint = keylineTintValue
      }

      // Extract activityBackgroundTint
      if let activityBackgroundTintValue = dict["ls_background_tint"] as? String {
        activityBackgroundTint = activityBackgroundTintValue
      }

      // Extract components for each region
      for region in VoltraRegion.allCases {
        if let jsonString = selectJsonString(from: dict, region: region) {
          do {
            let components = try parseComponents(from: jsonString)
            regions[region] = components
          } catch {
            throw ContentStateParsingError.regionParsingFailed(region, error)
          }
        }
      }

      return ParsedJsonData(regions: regions, keylineTint: keylineTint, activityBackgroundTint: activityBackgroundTint)
    }

    private static func parseRegions(from jsonString: String) throws -> [VoltraRegion: [VoltraComponent]] {
      var regions: [VoltraRegion: [VoltraComponent]] = [:]

      guard let data = jsonString.data(using: .utf8) else {
        throw ContentStateParsingError.invalidJsonString
      }
      
      let root: Any
      do {
        root = try JSONSerialization.jsonObject(with: data)
      } catch {
        throw ContentStateParsingError.jsonDeserializationFailed(error)
      }

      // If it's already an array, use it for all regions
      if root is [Any] {
        let components = try parseComponents(from: jsonString)
        for region in VoltraRegion.allCases {
          regions[region] = components
        }
        return regions
      }

      guard let dict = root as? [String: Any] else {
        throw ContentStateParsingError.invalidRootType
      }

      // Extract components for each region
      for region in VoltraRegion.allCases {
        if let jsonString = selectJsonString(from: dict, region: region) {
          do {
            let components = try parseComponents(from: jsonString)
            regions[region] = components
          } catch {
            throw ContentStateParsingError.regionParsingFailed(region, error)
          }
        }
      }

      return regions
    }

    private static func parseComponents(from jsonString: String) throws -> [VoltraComponent] {
      guard let data = jsonString.data(using: .utf8) else {
        throw ContentStateParsingError.invalidJsonString
      }
      
      do {
        return try JSONDecoder().decode([VoltraComponent].self, from: data)
      } catch {
        throw ContentStateParsingError.componentsParsingFailed(error)
      }
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
        // Component type is now a numeric ID, not a string
        guard dict["t"] != nil else { return nil }
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
      let compressedJson = try container.decode(String.self, forKey: .uiJsonData)
      uiJsonData = compressedJson
      // Decompress brotli-compressed base64 data
      let decompressedJson = try BrotliCompression.decompress(base64String: compressedJson)
      let parsedData = try ContentState.parseJsonData(from: decompressedJson)
      regions = parsedData.regions
      keylineTint = parsedData.keylineTint
      activityBackgroundTint = parsedData.activityBackgroundTint
    }
  }

  var name: String
  var deepLinkUrl: String?
}

