import Foundation

/// The parsed root payload for a Live Activity update
/// Handles the one-time JSON parsing and region extraction
public struct VoltraLiveActivityPayload: Hashable {
    /// Parsed UI trees for each region
    public let regions: [VoltraRegion: [VoltraNode]]

    /// Optional tint color for Dynamic Island keyline
    public let keylineTint: String?

    /// Optional background tint for Lock Screen
    public let activityBackgroundTint: String?

    /// Parse from decompressed JSON string (called once per update)
    public init(jsonString: String) throws {
        let root = try JSONValue.parse(from: jsonString)

        // Extract regions directly from the parsed tree
        self.regions = try Self.extractRegions(from: root)
        self.keylineTint = root["isl_keyline_tint"]?.stringValue
        self.activityBackgroundTint = root["ls_background_tint"]?.stringValue
    }

    /// Extract regions from the parsed JSON tree
    private static func extractRegions(from root: JSONValue) throws -> [VoltraRegion: [VoltraNode]] {
        var regions: [VoltraRegion: [VoltraNode]] = [:]

        // Handle array case (same UI for all regions)
        if case .array = root {
            let nodes = try parseNodes(from: root, stylesheetKey: nil, root: [:])
            for region in VoltraRegion.allCases {
                regions[region] = nodes
            }
            return regions
        }

        // Handle object case (region-specific UIs)
        guard case .object(let rootObject) = root else {
            throw NSError(domain: "VoltraLiveActivityPayload",
                         code: -1,
                         userInfo: [NSLocalizedDescriptionKey: "Invalid root JSON type"])
        }

        // Extract components for each region
        for region in VoltraRegion.allCases {
            if let regionValue = rootObject[region.jsonKey] {
                let stylesheetKey = region.jsonKey + "_s"
                let nodes = try parseNodes(from: regionValue, stylesheetKey: stylesheetKey, root: rootObject)
                regions[region] = nodes
            }
        }

        return regions
    }

    /// Parse an array of JSON values into VoltraNodes
    private static func parseNodes(from value: JSONValue, stylesheetKey: String?, root: [String: JSONValue] = [:]) throws -> [VoltraNode] {
        // Extract stylesheet for this region
        let stylesheet = extractStylesheet(from: root, stylesheetKey: stylesheetKey)

        if case .array(let nodeArray) = value {
            return try nodeArray.compactMap { nodeJson in
                guard case .object = nodeJson else { return nil }
                return try VoltraNode(from: nodeJson, stylesheet: stylesheet)
            }
        } else if case .object = value {
            // Single node wrapped in array
            return [try VoltraNode(from: value, stylesheet: stylesheet)]
        } else {
            return []
        }
    }

    /// Extract the appropriate stylesheet for a region
    private static func extractStylesheet(from root: [String: JSONValue], stylesheetKey: String?) -> [[String: JSONValue]]? {
        guard let key = stylesheetKey,
              case .array(let stylesheetArray) = root[key] else {
            return nil
        }

        // Convert JSONValue array to [[String: JSONValue]]
        return stylesheetArray.compactMap { item in
            if case .object(let dict) = item {
                return dict
            }
            return nil
        }
    }
}