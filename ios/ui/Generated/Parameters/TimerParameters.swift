//
//  TimerParameters.swift

//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Parameters for Timer component
/// Text-based countdown/stopwatch timer component
public struct TimerParameters: ComponentParameters {
    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Duration in milliseconds
    public let durationMs: Double?

    /// Count direction
    public let direction: String

    /// Hide timer when complete
    public let autoHideOnEnd: Bool?

    /// Text formatting style
    public let textStyle: String

    /// JSON-encoded TextTemplates object with running/completed templates
    public let textTemplates: String?

    enum CodingKeys: String, CodingKey {
        case endAtMs
        case startAtMs
        case durationMs
        case direction
        case autoHideOnEnd
        case textStyle
        case textTemplates
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        endAtMs = try container.decodeIfPresent(Double.self, forKey: .endAtMs)
        startAtMs = try container.decodeIfPresent(Double.self, forKey: .startAtMs)
        durationMs = try container.decodeIfPresent(Double.self, forKey: .durationMs)
        direction = try container.decodeIfPresent(String.self, forKey: .direction) ?? "down"
        autoHideOnEnd = try container.decodeIfPresent(Bool.self, forKey: .autoHideOnEnd)
        textStyle = try container.decodeIfPresent(String.self, forKey: .textStyle) ?? "timer"
        textTemplates = try container.decodeIfPresent(String.self, forKey: .textTemplates)
    }
}
