//
//  TextParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Text component
/// Display text content
public struct TextParameters: ComponentParameters {
  /// Maximum number of lines to display
  public let numberOfLines: Double?

  /// Text alignment for multiline text
  public let multilineTextAlignment: String?

  /// Specifies whether the font should be scaled down automatically to fit given style constraints
  public let adjustsFontSizeToFit: Bool?

  /// Specifies the smallest possible scale factor that the font can use
  public let minimumFontScale: Double?

  /// Whether the font should scale with system accessibility settings
  public let allowFontScaling: Bool

  /// Limits how much the font can grow via Dynamic Type
  public let maxFontSizeMultiplier: Double?

  enum CodingKeys: String, CodingKey {
    case numberOfLines
    case multilineTextAlignment
    case adjustsFontSizeToFit
    case minimumFontScale
    case allowFontScaling
    case maxFontSizeMultiplier
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    numberOfLines = try container.decodeIfPresent(Double.self, forKey: .numberOfLines)
    multilineTextAlignment = try container.decodeIfPresent(String.self, forKey: .multilineTextAlignment)
    adjustsFontSizeToFit = try container.decodeIfPresent(Bool.self, forKey: .adjustsFontSizeToFit)
    minimumFontScale = try container.decodeIfPresent(Double.self, forKey: .minimumFontScale)
    allowFontScaling = try container.decodeIfPresent(Bool.self, forKey: .allowFontScaling) ?? true
    maxFontSizeMultiplier = try container.decodeIfPresent(Double.self, forKey: .maxFontSizeMultiplier)
  }
}
