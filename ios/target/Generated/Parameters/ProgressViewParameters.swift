//
//  ProgressViewParameters.swift
//  VoltraUI
//
//  🤖 AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0
//
//  https://github.com/saulsharma/voltra
//  MIT LICENCE

import Foundation

/// Parameters for ProgressView component
/// Progress indicator (determinate or timer-based)
public struct ProgressViewParameters: ComponentParameters {
    /// Current progress value
    public let defaultValue: Double?

    /// Maximum progress value
    public let maximumValue: Double?

    /// Legacy: End time for timer-based progress
    public let timerEndDateInMilliseconds: Double?

    /// End time in milliseconds since epoch
    public let endAtMs: Double?

    /// Start time in milliseconds since epoch
    public let startAtMs: Double?

    /// Progress view style
    public let mode: String?
}
