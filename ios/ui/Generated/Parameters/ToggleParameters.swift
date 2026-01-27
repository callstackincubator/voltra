//
//  ToggleParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Toggle component
/// Toggle switch control
public struct ToggleParameters: ComponentParameters {
  /// Initial toggle state
  public let defaultValue: Bool

  enum CodingKeys: String, CodingKey {
    case defaultValue
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    defaultValue = try container.decodeIfPresent(Bool.self, forKey: .defaultValue) ?? false
  }
}
