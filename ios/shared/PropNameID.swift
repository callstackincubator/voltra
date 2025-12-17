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
    case autoHideOnEnd = 2
    case buttonStyle = 3
    case colors = 4
    case cornerRadius = 5
    case countDown = 6
    case currentValueLabel = 7
    case defaultValue = 8
    case direction = 9
    case dither = 10
    case durationMs = 11
    case endAtMs = 12
    case endPoint = 13
    case gaugeStyle = 14
    case height = 15
    case label = 16
    case lineWidth = 17
    case maskElement = 18
    case maximumValue = 19
    case maximumValueLabel = 20
    case minLength = 21
    case minimumValue = 22
    case minimumValueLabel = 23
    case multilineTextAlignment = 24
    case name = 25
    case numberOfLines = 26
    case progressColor = 27
    case resizeMode = 28
    case scale = 29
    case size = 30
    case source = 31
    case spacing = 32
    case startAtMs = 33
    case startPoint = 34
    case stops = 35
    case systemImage = 36
    case textStyle = 37
    case textTemplates = 38
    case thumb = 39
    case tintColor = 40
    case title = 41
    case trackColor = 42
    case type = 43
    case value = 44
    case weight = 45
    
    /// Get the prop name string for this ID
    public var propName: String {
        switch self {
        case .style:
            return "style"
        case .alignment:
            return "alignment"
        case .autoHideOnEnd:
            return "autoHideOnEnd"
        case .buttonStyle:
            return "buttonStyle"
        case .colors:
            return "colors"
        case .cornerRadius:
            return "cornerRadius"
        case .countDown:
            return "countDown"
        case .currentValueLabel:
            return "currentValueLabel"
        case .defaultValue:
            return "defaultValue"
        case .direction:
            return "direction"
        case .dither:
            return "dither"
        case .durationMs:
            return "durationMs"
        case .endAtMs:
            return "endAtMs"
        case .endPoint:
            return "endPoint"
        case .gaugeStyle:
            return "gaugeStyle"
        case .height:
            return "height"
        case .label:
            return "label"
        case .lineWidth:
            return "lineWidth"
        case .maskElement:
            return "maskElement"
        case .maximumValue:
            return "maximumValue"
        case .maximumValueLabel:
            return "maximumValueLabel"
        case .minLength:
            return "minLength"
        case .minimumValue:
            return "minimumValue"
        case .minimumValueLabel:
            return "minimumValueLabel"
        case .multilineTextAlignment:
            return "multilineTextAlignment"
        case .name:
            return "name"
        case .numberOfLines:
            return "numberOfLines"
        case .progressColor:
            return "progressColor"
        case .resizeMode:
            return "resizeMode"
        case .scale:
            return "scale"
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
        case .thumb:
            return "thumb"
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
        case "autoHideOnEnd": self = .autoHideOnEnd
        case "buttonStyle": self = .buttonStyle
        case "colors": self = .colors
        case "cornerRadius": self = .cornerRadius
        case "countDown": self = .countDown
        case "currentValueLabel": self = .currentValueLabel
        case "defaultValue": self = .defaultValue
        case "direction": self = .direction
        case "dither": self = .dither
        case "durationMs": self = .durationMs
        case "endAtMs": self = .endAtMs
        case "endPoint": self = .endPoint
        case "gaugeStyle": self = .gaugeStyle
        case "height": self = .height
        case "label": self = .label
        case "lineWidth": self = .lineWidth
        case "maskElement": self = .maskElement
        case "maximumValue": self = .maximumValue
        case "maximumValueLabel": self = .maximumValueLabel
        case "minLength": self = .minLength
        case "minimumValue": self = .minimumValue
        case "minimumValueLabel": self = .minimumValueLabel
        case "multilineTextAlignment": self = .multilineTextAlignment
        case "name": self = .name
        case "numberOfLines": self = .numberOfLines
        case "progressColor": self = .progressColor
        case "resizeMode": self = .resizeMode
        case "scale": self = .scale
        case "size": self = .size
        case "source": self = .source
        case "spacing": self = .spacing
        case "startAtMs": self = .startAtMs
        case "startPoint": self = .startPoint
        case "stops": self = .stops
        case "systemImage": self = .systemImage
        case "textStyle": self = .textStyle
        case "textTemplates": self = .textTemplates
        case "thumb": self = .thumb
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
