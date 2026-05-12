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

  /// Text formatting style
  public let textStyle: String

  /// JSON-encoded TextTemplates object with running/completed templates
  public let textTemplates: String?

  /// Whether to show hours component when duration exceeds 60 minutes. If false, minutes will exceed 60 (e.g., 94:00 instead of 1:34:00)
  public let showHours: Bool

  enum CodingKeys: String, CodingKey {
    case endAtMs
    case startAtMs
    case durationMs
    case direction
    case textStyle
    case textTemplates
    case showHours
  }

  public init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)
    endAtMs = try container.decodeIfPresent(Double.self, forKey: .endAtMs)
    startAtMs = try container.decodeIfPresent(Double.self, forKey: .startAtMs)
    durationMs = try container.decodeIfPresent(Double.self, forKey: .durationMs)
    direction = try container.decodeIfPresent(String.self, forKey: .direction) ?? "down"
    textStyle = try container.decodeIfPresent(String.self, forKey: .textStyle) ?? "timer"
    textTemplates = try container.decodeIfPresent(String.self, forKey: .textTemplates)
    showHours = try container.decodeIfPresent(Bool.self, forKey: .showHours) ?? false
  }
}
