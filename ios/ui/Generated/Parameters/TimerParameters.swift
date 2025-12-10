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
    public let direction: String = "down"

    /// Hide timer when complete
    public let autoHideOnEnd: Bool?

    /// Text formatting style
    public let textStyle: String = "timer"

    /// JSON-encoded TextTemplates object with running/completed templates
    public let textTemplates: String?
}
