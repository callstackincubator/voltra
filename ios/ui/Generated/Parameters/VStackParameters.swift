//
//  VStackParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for VStack component
/// Vertical stack container
public struct VStackParameters: ComponentParameters {
  /// Spacing between children
  public let spacing: Double

  /// Horizontal alignment
  public let alignment: String

  enum CodingKeys: String, CodingKey {
    case spacing
    case alignment
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    spacing = try container.decodeIfPresent(Double.self, forKey: .spacing) ?? 0
    alignment = try container.decodeIfPresent(String.self, forKey: .alignment) ?? "center"
  }
}
