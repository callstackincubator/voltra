//
//  GaugeParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Gauge component
/// Gauge indicator for progress visualization
public struct GaugeParameters: ComponentParameters {
    /// Current gauge value (0-1 range)
    public let defaultValue: Double?

    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Show the value label
    public let showValueLabel: Bool?

    /// Hide the value label
    public let hideValueLabel: Bool?
}
