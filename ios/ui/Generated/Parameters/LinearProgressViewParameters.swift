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
    public let maximumValue: Double

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

    /// Custom thumb component to display at progress position
    public let thumb: String?

    enum CodingKeys: String, CodingKey {
        case value
        case countDown
        case maximumValue
        case endAtMs
        case startAtMs
        case trackColor
        case progressColor
        case cornerRadius
        case height
        case thumb
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        value = try container.decodeIfPresent(Double.self, forKey: .value)
        countDown = try container.decodeIfPresent(Bool.self, forKey: .countDown)
        maximumValue = try container.decodeIfPresent(Double.self, forKey: .maximumValue) ?? 100
        endAtMs = try container.decodeIfPresent(Double.self, forKey: .endAtMs)
        startAtMs = try container.decodeIfPresent(Double.self, forKey: .startAtMs)
        trackColor = try container.decodeIfPresent(String.self, forKey: .trackColor)
        progressColor = try container.decodeIfPresent(String.self, forKey: .progressColor)
        cornerRadius = try container.decodeIfPresent(Double.self, forKey: .cornerRadius)
        height = try container.decodeIfPresent(Double.self, forKey: .height)
        thumb = try container.decodeIfPresent(String.self, forKey: .thumb)
    }
}
