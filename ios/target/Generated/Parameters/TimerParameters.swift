//
//  TimerParameters.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

/// Parameters for Timer component
/// Flexible countdown/stopwatch component
public struct TimerParameters: ComponentParameters {
    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Duration in milliseconds
    public let durationMs: Double?

    /// Display mode
    public let mode: String?

    /// Count direction
    public let direction: String?

    /// Hide timer when complete
    public let autoHideOnEnd: Bool?

    /// Text formatting style
    public let textStyle: String?

    /// JSON-encoded TextTemplates object with running/completed templates
    public let textTemplates: String?

    /// JSON-encoded mode-specific modifiers map
    public let modeOrderedModifiers: String?

    /// JSON-encoded track colors map
    public let modeTrackColors: String?

    /// JSON-encoded tint colors map
    public let modeTintColors: String?
}
