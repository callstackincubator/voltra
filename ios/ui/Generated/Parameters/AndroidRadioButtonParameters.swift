//
//  AndroidRadioButtonParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for AndroidRadioButton component
/// Android Material Design radio button component for widgets
public struct AndroidRadioButtonParameters: ComponentParameters {
  /// Unique identifier for this radio button (required for interaction events)
  public let id: String?

  /// Initial checked state
  public let checked: Bool

  enum CodingKeys: String, CodingKey {
    case id
    case checked
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    id = try container.decodeIfPresent(String.self, forKey: .id)
    checked = try container.decodeIfPresent(Bool.self, forKey: .checked) ?? false
  }
}
