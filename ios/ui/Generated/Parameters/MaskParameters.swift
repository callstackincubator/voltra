//
//  MaskParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Mask component
/// Mask content using any Voltra element as the mask shape
public struct MaskParameters: ComponentParameters {
  /// Voltra element used as the mask - alpha channel determines visibility
  public let maskElement: String?
}
