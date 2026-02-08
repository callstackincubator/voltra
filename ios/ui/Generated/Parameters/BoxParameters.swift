//
//  BoxParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Box component
/// Flex container with configurable direction. Always uses flexbox layout.
public struct BoxParameters: ComponentParameters {
  /// Spacing between children
  public let spacing: Double

  enum CodingKeys: String, CodingKey {
    case spacing
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    spacing = try container.decodeIfPresent(Double.self, forKey: .spacing) ?? 0
  }
}
