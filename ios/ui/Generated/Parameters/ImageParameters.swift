//
//  ImageParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Image component
/// Display images from Android drawable resources
public struct ImageParameters: ComponentParameters {
    /// Image source - { assetName: string } for Android drawable resources or preloaded assets
    public let source: String?

    /// How the image should be resized to fit its container
    public let resizeMode: String

    enum CodingKeys: String, CodingKey {
        case source
        case resizeMode
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        source = try container.decodeIfPresent(String.self, forKey: .source)
        resizeMode = try container.decodeIfPresent(String.self, forKey: .resizeMode) ?? "cover"
    }
}
