//
//  GaugeParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Gauge component
/// Gauge indicator for progress visualization
public struct GaugeParameters: ComponentParameters {
  /// Current gauge value
  public let value: Double?

  /// Minimum value of the gauge range
  public let minimumValue: Double

  /// Maximum value of the gauge range
  public let maximumValue: Double

  /// End time in milliseconds since epoch
  public let endAtMs: Double?

  /// Start time in milliseconds since epoch
  public let startAtMs: Double?

  /// Tint color for the gauge
  public let tintColor: String?

  /// Visual style of the gauge
  public let gaugeStyle: String?

  enum CodingKeys: String, CodingKey {
    case value
    case minimumValue
    case maximumValue
    case endAtMs
    case startAtMs
    case tintColor
    case gaugeStyle
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    value = try container.decodeIfPresent(Double.self, forKey: .value)
    minimumValue = try container.decodeIfPresent(Double.self, forKey: .minimumValue) ?? 0
    maximumValue = try container.decodeIfPresent(Double.self, forKey: .maximumValue) ?? 1
    endAtMs = try container.decodeIfPresent(Double.self, forKey: .endAtMs)
    startAtMs = try container.decodeIfPresent(Double.self, forKey: .startAtMs)
    tintColor = try container.decodeIfPresent(String.self, forKey: .tintColor)
    gaugeStyle = try container.decodeIfPresent(String.self, forKey: .gaugeStyle)
  }
}
