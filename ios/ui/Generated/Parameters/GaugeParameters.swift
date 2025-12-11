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
    public let minimumValue: Double = 0

    /// Maximum value of the gauge range
    public let maximumValue: Double = 1

    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Tint color for the gauge
    public let tintColor: String?

    /// Visual style of the gauge
    public let gaugeStyle: String?

    /// Custom text for current value label
    public let currentValueLabel: String?

    /// Text for minimum value label
    public let minimumValueLabel: String?

    /// Text for maximum value label
    public let maximumValueLabel: String?
}
