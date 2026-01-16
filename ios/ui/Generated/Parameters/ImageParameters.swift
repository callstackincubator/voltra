//
//  ImageParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Image component
/// Display images from asset catalog or base64 data
public struct ImageParameters: ComponentParameters {
    /// Image source - either { assetName: string } for asset catalog images or { base64: string } for base64 encoded images
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
