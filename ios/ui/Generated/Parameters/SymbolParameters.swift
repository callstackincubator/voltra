//
//  SymbolParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Symbol component
/// Display SF Symbols with advanced configuration
public struct SymbolParameters: ComponentParameters {
    /// SF Symbol name
    public let name: String?

    /// Symbol rendering type
    public let type: String?

    /// Symbol scale
    public let scale: String?

    /// Symbol weight
    public let weight: String?

    /// Symbol size in points
    public let size: Double

    /// Tint color for the symbol
    public let tintColor: String?

    /// Pipe-separated colors for palette type
    public let colors: String?

    /// Image resize mode
    public let resizeMode: String?

    /// JSON-encoded animation specification
    public let animationSpec: String?

    enum CodingKeys: String, CodingKey {
        case name
        case type
        case scale
        case weight
        case size
        case tintColor
        case colors
        case resizeMode
        case animationSpec
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        name = try container.decodeIfPresent(String.self, forKey: .name)
        type = try container.decodeIfPresent(String.self, forKey: .type)
        scale = try container.decodeIfPresent(String.self, forKey: .scale)
        weight = try container.decodeIfPresent(String.self, forKey: .weight)
        size = try container.decodeIfPresent(Double.self, forKey: .size) ?? 24
        tintColor = try container.decodeIfPresent(String.self, forKey: .tintColor)
        colors = try container.decodeIfPresent(String.self, forKey: .colors)
        resizeMode = try container.decodeIfPresent(String.self, forKey: .resizeMode)
        animationSpec = try container.decodeIfPresent(String.self, forKey: .animationSpec)
    }
}
