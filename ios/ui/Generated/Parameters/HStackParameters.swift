//
//  HStackParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for HStack component
/// Horizontal stack container
public struct HStackParameters: ComponentParameters {
  /// Vertical alignment
  public let alignment: String

  /// Layout mode. 'stack' uses native SwiftUI stacks. 'flex' uses RN-like flexbox.
  public let layout: String

  enum CodingKeys: String, CodingKey {
    case alignment
    case layout
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    alignment = try container.decodeIfPresent(String.self, forKey: .alignment) ?? "center"
    layout = try container.decodeIfPresent(String.self, forKey: .layout) ?? "stack"
  }
}
