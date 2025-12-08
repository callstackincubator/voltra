//
//  PropNameID.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Prop name IDs mapped from data/components.json
/// 'style' is always assigned ID 0, other props follow sequentially (starting from ID 1)
public enum PropNameID: Int, Codable {
    case style = 0
    case alignment = 1
    case animationSpec = 2
    case autoHideOnEnd = 3
    case axis = 4
    case colors = 5
    case defaultValue = 6
    case direction = 7
    case dither = 8
    case durationMs = 9
    case effect = 10
    case endAtMs = 11
    case endPoint = 12
    case hideValueLabel = 13
    case interactive = 14
    case isExpanded = 15
    case maximumLabel = 16
    case maximumValue = 17
    case minLength = 18
    case minimumLabel = 19
    case minimumValue = 20
    case mode = 21
    case modeOrderedModifiers = 22
    case modeTintColors = 23
    case modeTrackColors = 24
    case name = 25
    case resizeMode = 26
    case scale = 27
    case showValueLabel = 28
    case showsIndicators = 29
    case size = 30
    case source = 31
    case spacing = 32
    case startAtMs = 33
    case startPoint = 34
    case stops = 35
    case systemImage = 36
    case textStyle = 37
    case textTemplates = 38
    case timerEndDateInMilliseconds = 39
    case tint = 40
    case tintColor = 41
    case title = 42
    case type = 43
    case weight = 44
    
    /// Get the prop name string for this ID
    public var propName: String {
        switch self {
        case .style:
            return "style"
        case .alignment:
            return "alignment"
        case .animationSpec:
            return "animationSpec"
        case .autoHideOnEnd:
            return "autoHideOnEnd"
        case .axis:
            return "axis"
        case .colors:
            return "colors"
        case .defaultValue:
            return "defaultValue"
        case .direction:
            return "direction"
        case .dither:
            return "dither"
        case .durationMs:
            return "durationMs"
        case .effect:
            return "effect"
        case .endAtMs:
            return "endAtMs"
        case .endPoint:
            return "endPoint"
        case .hideValueLabel:
            return "hideValueLabel"
        case .interactive:
            return "interactive"
        case .isExpanded:
            return "isExpanded"
        case .maximumLabel:
            return "maximumLabel"
        case .maximumValue:
            return "maximumValue"
        case .minLength:
            return "minLength"
        case .minimumLabel:
            return "minimumLabel"
        case .minimumValue:
            return "minimumValue"
        case .mode:
            return "mode"
        case .modeOrderedModifiers:
            return "modeOrderedModifiers"
        case .modeTintColors:
            return "modeTintColors"
        case .modeTrackColors:
            return "modeTrackColors"
        case .name:
            return "name"
        case .resizeMode:
            return "resizeMode"
        case .scale:
            return "scale"
        case .showValueLabel:
            return "showValueLabel"
        case .showsIndicators:
            return "showsIndicators"
        case .size:
            return "size"
        case .source:
            return "source"
        case .spacing:
            return "spacing"
        case .startAtMs:
            return "startAtMs"
        case .startPoint:
            return "startPoint"
        case .stops:
            return "stops"
        case .systemImage:
            return "systemImage"
        case .textStyle:
            return "textStyle"
        case .textTemplates:
            return "textTemplates"
        case .timerEndDateInMilliseconds:
            return "timerEndDateInMilliseconds"
        case .tint:
            return "tint"
        case .tintColor:
            return "tintColor"
        case .title:
            return "title"
        case .type:
            return "type"
        case .weight:
            return "weight"
        }
    }
    
    /// Initialize from prop name string
    /// - Parameter name: Prop name (e.g., "title", "systemImage")
    /// - Returns: PropNameID if found, nil otherwise
    public init?(propName: String) {
        switch propName {
        case "style": self = .style
        case "alignment": self = .alignment
        case "animationSpec": self = .animationSpec
        case "autoHideOnEnd": self = .autoHideOnEnd
        case "axis": self = .axis
        case "colors": self = .colors
        case "defaultValue": self = .defaultValue
        case "direction": self = .direction
        case "dither": self = .dither
        case "durationMs": self = .durationMs
        case "effect": self = .effect
        case "endAtMs": self = .endAtMs
        case "endPoint": self = .endPoint
        case "hideValueLabel": self = .hideValueLabel
        case "interactive": self = .interactive
        case "isExpanded": self = .isExpanded
        case "maximumLabel": self = .maximumLabel
        case "maximumValue": self = .maximumValue
        case "minLength": self = .minLength
        case "minimumLabel": self = .minimumLabel
        case "minimumValue": self = .minimumValue
        case "mode": self = .mode
        case "modeOrderedModifiers": self = .modeOrderedModifiers
        case "modeTintColors": self = .modeTintColors
        case "modeTrackColors": self = .modeTrackColors
        case "name": self = .name
        case "resizeMode": self = .resizeMode
        case "scale": self = .scale
        case "showValueLabel": self = .showValueLabel
        case "showsIndicators": self = .showsIndicators
        case "size": self = .size
        case "source": self = .source
        case "spacing": self = .spacing
        case "startAtMs": self = .startAtMs
        case "startPoint": self = .startPoint
        case "stops": self = .stops
        case "systemImage": self = .systemImage
        case "textStyle": self = .textStyle
        case "textTemplates": self = .textTemplates
        case "timerEndDateInMilliseconds": self = .timerEndDateInMilliseconds
        case "tint": self = .tint
        case "tintColor": self = .tintColor
        case "title": self = .title
        case "type": self = .type
        case "weight": self = .weight
        default:
            return nil
        }
    }
}
