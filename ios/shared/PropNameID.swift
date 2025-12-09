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
    case cornerRadius = 6
    case countDown = 7
    case defaultValue = 8
    case direction = 9
    case dither = 10
    case durationMs = 11
    case effect = 12
    case endAtMs = 13
    case endPoint = 14
    case height = 15
    case hideValueLabel = 16
    case interactive = 17
    case isExpanded = 18
    case lineWidth = 19
    case maximumLabel = 20
    case maximumValue = 21
    case minLength = 22
    case minimumLabel = 23
    case minimumValue = 24
    case name = 25
    case progressColor = 26
    case resizeMode = 27
    case scale = 28
    case showValueLabel = 29
    case showsIndicators = 30
    case size = 31
    case source = 32
    case spacing = 33
    case startAtMs = 34
    case startPoint = 35
    case stops = 36
    case systemImage = 37
    case textStyle = 38
    case textTemplates = 39
    case thumbImage = 40
    case tint = 41
    case tintColor = 42
    case title = 43
    case trackColor = 44
    case type = 45
    case value = 46
    case weight = 47
    
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
        case .cornerRadius:
            return "cornerRadius"
        case .countDown:
            return "countDown"
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
        case .height:
            return "height"
        case .hideValueLabel:
            return "hideValueLabel"
        case .interactive:
            return "interactive"
        case .isExpanded:
            return "isExpanded"
        case .lineWidth:
            return "lineWidth"
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
        case .name:
            return "name"
        case .progressColor:
            return "progressColor"
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
        case .thumbImage:
            return "thumbImage"
        case .tint:
            return "tint"
        case .tintColor:
            return "tintColor"
        case .title:
            return "title"
        case .trackColor:
            return "trackColor"
        case .type:
            return "type"
        case .value:
            return "value"
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
        case "cornerRadius": self = .cornerRadius
        case "countDown": self = .countDown
        case "defaultValue": self = .defaultValue
        case "direction": self = .direction
        case "dither": self = .dither
        case "durationMs": self = .durationMs
        case "effect": self = .effect
        case "endAtMs": self = .endAtMs
        case "endPoint": self = .endPoint
        case "height": self = .height
        case "hideValueLabel": self = .hideValueLabel
        case "interactive": self = .interactive
        case "isExpanded": self = .isExpanded
        case "lineWidth": self = .lineWidth
        case "maximumLabel": self = .maximumLabel
        case "maximumValue": self = .maximumValue
        case "minLength": self = .minLength
        case "minimumLabel": self = .minimumLabel
        case "minimumValue": self = .minimumValue
        case "name": self = .name
        case "progressColor": self = .progressColor
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
        case "thumbImage": self = .thumbImage
        case "tint": self = .tint
        case "tintColor": self = .tintColor
        case "title": self = .title
        case "trackColor": self = .trackColor
        case "type": self = .type
        case "value": self = .value
        case "weight": self = .weight
        default:
            return nil
        }
    }
}
