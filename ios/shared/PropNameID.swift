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
    case colors = 4
    case cornerRadius = 5
    case countDown = 6
    case defaultValue = 7
    case direction = 8
    case dither = 9
    case durationMs = 10
    case effect = 11
    case endAtMs = 12
    case endPoint = 13
    case height = 14
    case hideValueLabel = 15
    case interactive = 16
    case lineWidth = 17
    case maskElement = 18
    case maximumValue = 19
    case minLength = 20
    case name = 21
    case numberOfLines = 22
    case progressColor = 23
    case resizeMode = 24
    case scale = 25
    case showValueLabel = 26
    case size = 27
    case source = 28
    case spacing = 29
    case startAtMs = 30
    case startPoint = 31
    case stops = 32
    case systemImage = 33
    case textStyle = 34
    case textTemplates = 35
    case thumb = 36
    case tint = 37
    case tintColor = 38
    case title = 39
    case trackColor = 40
    case type = 41
    case value = 42
    case weight = 43
    
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
        case .lineWidth:
            return "lineWidth"
        case .maskElement:
            return "maskElement"
        case .maximumValue:
            return "maximumValue"
        case .minLength:
            return "minLength"
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
        case .showValueLabel:
            return "showValueLabel"
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
        case "lineWidth": self = .lineWidth
        case "maskElement": self = .maskElement
        case "maximumValue": self = .maximumValue
        case "minLength": self = .minLength
        case "name": self = .name
        case "numberOfLines": self = .numberOfLines
        case "progressColor": self = .progressColor
        case "resizeMode": self = .resizeMode
        case "scale": self = .scale
        case "showValueLabel": self = .showValueLabel
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
