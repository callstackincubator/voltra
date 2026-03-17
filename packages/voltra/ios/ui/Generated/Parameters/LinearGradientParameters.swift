//
//  LinearGradientParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for LinearGradient component
/// Linear gradient background with children
public struct LinearGradientParameters: ComponentParameters {
  /// Pipe-separated color list (e.g., '#ff0000|#00ff00|#0000ff')
  public let colors: String?

  /// Pipe-separated gradient stops (e.g., 'red@0|orange@0.5|yellow@1')
  public let stops: String?

  /// Start point (e.g., 'topLeading', 'center', or 'x,y')
  public let startPoint: String?

  /// End point (e.g., 'bottomTrailing', 'center', or 'x,y')
  public let endPoint: String?

  /// Enable dithering (system-controlled)
  public let dither: Bool?
}
