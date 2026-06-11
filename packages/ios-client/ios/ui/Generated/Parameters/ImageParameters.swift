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

  /// iOS 18+ Home Screen widgets only. Controls how the image is rendered when the widget is in an accented (tinted) or vibrant rendering mode. Use 'fullColor' to opt the image out of the system's desaturation so it keeps its original colors on top of the tinted backdrop. No-op outside of accented/vibrant rendering modes.
  public let accentedRenderingMode: String?

  enum CodingKeys: String, CodingKey {
    case source
    case resizeMode
    case accentedRenderingMode
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    source = try container.decodeIfPresent(String.self, forKey: .source)
    resizeMode = try container.decodeIfPresent(String.self, forKey: .resizeMode) ?? "cover"
    accentedRenderingMode = try container.decodeIfPresent(String.self, forKey: .accentedRenderingMode)
  }
}
