//
//  FilledButtonParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for FilledButton component
/// Android Material Design filled button component for widgets
public struct FilledButtonParameters: ComponentParameters {
  /// Text to display on the button
  public let text: String?

  /// Whether the button is enabled
  public let enabled: Bool

  enum CodingKeys: String, CodingKey {
    case text
    case enabled
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    text = try container.decodeIfPresent(String.self, forKey: .text)
    enabled = try container.decodeIfPresent(Bool.self, forKey: .enabled) ?? true
  }
}
