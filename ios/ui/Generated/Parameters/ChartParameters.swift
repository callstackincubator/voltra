//
//  ChartParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Chart component
/// SwiftUI Charts component for data visualization
public struct ChartParameters: ComponentParameters {
  /// Compact mark data encoded from children by toJSON
  public let marks: String?

  /// Show or hide the x-axis
  public let xAxisVisibility: String?

  /// Show or hide the y-axis
  public let yAxisVisibility: String?

  /// Show or hide the chart legend
  public let legendVisibility: String?

  /// Map of series name to color string
  public let foregroundStyleScale: String?

  /// Enable scrolling on the given axis
  public let chartScrollableAxes: String?
}
