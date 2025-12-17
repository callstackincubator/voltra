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

    /// Whether this payload represents an unsupported version (renders empty)
    public let isUnsupportedVersion: Bool

    /// Parse from decompressed JSON string (called once per update)
    public init(jsonString: String) throws {
        let root = try JSONValue.parse(from: jsonString)

        // Migrate to current version if needed
        guard let migrated = try VoltraPayloadMigrator.migrateToCurrentVersion(root) else {
            // Unsupported version (future version) - render empty
            self.regions = [:]
            self.keylineTint = nil
            self.activityBackgroundTint = nil
            self.isUnsupportedVersion = true
            return
        }

        // Extract regions directly from the parsed tree
        self.regions = try Self.extractRegions(from: migrated)
        self.keylineTint = migrated["isl_keyline_tint"]?.stringValue
        self.activityBackgroundTint = migrated["ls_background_tint"]?.stringValue
        self.isUnsupportedVersion = false
    }

    /// Extract regions from the parsed JSON tree
    private static func extractRegions(from root: JSONValue) throws -> [VoltraRegion: [VoltraNode]] {
        var regions: [VoltraRegion: [VoltraNode]] = [:]

        // Handle array case (same UI for all regions)
        if case .array = root {
            let nodes = try parseNodes(from: root, stylesheet: nil, sharedElements: nil)
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

        // Extract the shared stylesheet from root (key "s")
        let stylesheet = extractStylesheet(from: rootObject)

        // Extract the shared elements from root (key "e") for element deduplication
        let sharedElements = extractSharedElements(from: rootObject)

        // Extract components for each region
        for region in VoltraRegion.allCases {
            if let regionValue = rootObject[region.jsonKey] {
                let nodes = try parseNodes(from: regionValue, stylesheet: stylesheet, sharedElements: sharedElements)
                regions[region] = nodes
            }
        }

        return regions
    }

    /// Parse an array of JSON values into VoltraNodes
    private static func parseNodes(from value: JSONValue, stylesheet: [[String: JSONValue]]?, sharedElements: [JSONValue]?) throws -> [VoltraNode] {
        if case .array(let nodeArray) = value {
            return try nodeArray.compactMap { nodeJson in
                guard case .object = nodeJson else { return nil }
                return try VoltraNode(from: nodeJson, stylesheet: stylesheet, sharedElements: sharedElements)
            }
        } else if case .object = value {
            // Single node wrapped in array
            return [try VoltraNode(from: value, stylesheet: stylesheet, sharedElements: sharedElements)]
        } else {
            return []
        }
    }

    /// Extract the shared stylesheet from root
    private static func extractStylesheet(from root: [String: JSONValue]) -> [[String: JSONValue]]? {
        guard case .array(let stylesheetArray) = root["s"] else {
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

    /// Extract the shared elements array from root (for element deduplication)
    private static func extractSharedElements(from root: [String: JSONValue]) -> [JSONValue]? {
        guard case .array(let elementsArray) = root["e"] else {
            return nil
        }
        return elementsArray
    }
}