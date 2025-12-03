//
//  SymbolViewParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for SymbolView component
/// Display SF Symbols with advanced configuration
public struct SymbolViewParameters: ComponentParameters {
    /// SF Symbol name
    public let name: String?

    /// Symbol rendering type
    public let type: String?

    /// Symbol scale
    public let scale: String?

    /// Symbol weight
    public let weight: String?

    /// Symbol size in points
    public let size: Double?

    /// Tint color for the symbol
    public let tintColor: String?

    /// Pipe-separated colors for palette type
    public let colors: String?

    /// Image resize mode
    public let resizeMode: String?

    /// JSON-encoded animation specification
    public let animationSpec: String?
}
