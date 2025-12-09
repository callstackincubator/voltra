//
//  LinearProgressViewParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for LinearProgressView component
/// Linear progress indicator (determinate or timer-based)
public struct LinearProgressViewParameters: ComponentParameters {
    /// Current progress value
    public let value: Double?

    /// Whether to count down instead of up
    public let countDown: Bool?

    /// Maximum progress value
    public let maximumValue: Double?

    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Color for the track (background) of the progress bar
    public let trackColor: String?

    /// Color for the progress fill
    public let progressColor: String?

    /// Corner radius for the progress bar
    public let cornerRadius: Double?

    /// Explicit height for the progress bar
    public let height: Double?

    /// Image source for thumb indicator (same format as Image component: { assetName: string } or { base64: string })
    public let thumbImage: String?
}
