//
//  CircularProgressViewParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for CircularProgressView component
/// Circular progress indicator (determinate or timer-based)
public struct CircularProgressViewParameters: ComponentParameters {
    /// Current progress value
    public let value: Double?

    /// Whether to count down instead of up
    public let countDown: Bool?

    /// Maximum progress value
    public let maximumValue: Double = 100

    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Color for the track (background) of the circular progress indicator
    public let trackColor: String?

    /// Color for the progress fill
    public let progressColor: String?

    /// Width of the stroke line
    public let lineWidth: Double?
}
