//
//  ComponentTypeID.swift
//
//  AUTO-GENERATED from data/components.json
//  DO NOT EDIT MANUALLY - Changes will be overwritten
//  Schema version: 1.0.0

import Foundation

/// Component type IDs mapped from data/components.json
/// IDs are assigned sequentially based on order in components.json (0-indexed)
public enum ComponentTypeID: Int, Codable {
    case TEXT = 0
    case BUTTON = 1
    case LABEL = 2
    case IMAGE = 3
    case SYMBOL = 4
    case TOGGLE = 5
    case SLIDER = 6
    case LINEAR_PROGRESS_VIEW = 7
    case CIRCULAR_PROGRESS_VIEW = 8
    case GAUGE = 9
    case TIMER = 10
    case LINEAR_GRADIENT = 11
    case V_STACK = 12
    case H_STACK = 13
    case Z_STACK = 14
    case SCROLL_VIEW = 15
    case LIST = 16
    case NAVIGATION_VIEW = 17
    case FORM = 18
    case GROUP_BOX = 19
    case DISCLOSURE_GROUP = 20
    case H_SPLIT_VIEW = 21
    case V_SPLIT_VIEW = 22
    case PICKER = 23
    case GLASS_CONTAINER = 24
    case GLASS_VIEW = 25
    case SPACER = 26
    case DIVIDER = 27
    
    /// Get the component name string for this ID
    public var componentName: String {
        switch self {
        case .TEXT:
            return "Text"
        case .BUTTON:
            return "Button"
        case .LABEL:
            return "Label"
        case .IMAGE:
            return "Image"
        case .SYMBOL:
            return "Symbol"
        case .TOGGLE:
            return "Toggle"
        case .SLIDER:
            return "Slider"
        case .LINEAR_PROGRESS_VIEW:
            return "LinearProgressView"
        case .CIRCULAR_PROGRESS_VIEW:
            return "CircularProgressView"
        case .GAUGE:
            return "Gauge"
        case .TIMER:
            return "Timer"
        case .LINEAR_GRADIENT:
            return "LinearGradient"
        case .V_STACK:
            return "VStack"
        case .H_STACK:
            return "HStack"
        case .Z_STACK:
            return "ZStack"
        case .SCROLL_VIEW:
            return "ScrollView"
        case .LIST:
            return "List"
        case .NAVIGATION_VIEW:
            return "NavigationView"
        case .FORM:
            return "Form"
        case .GROUP_BOX:
            return "GroupBox"
        case .DISCLOSURE_GROUP:
            return "DisclosureGroup"
        case .H_SPLIT_VIEW:
            return "HSplitView"
        case .V_SPLIT_VIEW:
            return "VSplitView"
        case .PICKER:
            return "Picker"
        case .GLASS_CONTAINER:
            return "GlassContainer"
        case .GLASS_VIEW:
            return "GlassView"
        case .SPACER:
            return "Spacer"
        case .DIVIDER:
            return "Divider"
        }
    }
    
    /// Initialize from component name string
    /// - Parameter name: Component name (e.g., "Text", "VStack")
    /// - Returns: ComponentTypeID if found, nil otherwise
    public init?(componentName: String) {
        switch componentName {
        case "Text": self = .TEXT
        case "Button": self = .BUTTON
        case "Label": self = .LABEL
        case "Image": self = .IMAGE
        case "Symbol": self = .SYMBOL
        case "Toggle": self = .TOGGLE
        case "Slider": self = .SLIDER
        case "LinearProgressView": self = .LINEAR_PROGRESS_VIEW
        case "CircularProgressView": self = .CIRCULAR_PROGRESS_VIEW
        case "Gauge": self = .GAUGE
        case "Timer": self = .TIMER
        case "LinearGradient": self = .LINEAR_GRADIENT
        case "VStack": self = .V_STACK
        case "HStack": self = .H_STACK
        case "ZStack": self = .Z_STACK
        case "ScrollView": self = .SCROLL_VIEW
        case "List": self = .LIST
        case "NavigationView": self = .NAVIGATION_VIEW
        case "Form": self = .FORM
        case "GroupBox": self = .GROUP_BOX
        case "DisclosureGroup": self = .DISCLOSURE_GROUP
        case "HSplitView": self = .H_SPLIT_VIEW
        case "VSplitView": self = .V_SPLIT_VIEW
        case "Picker": self = .PICKER
        case "GlassContainer": self = .GLASS_CONTAINER
        case "GlassView": self = .GLASS_VIEW
        case "Spacer": self = .SPACER
        case "Divider": self = .DIVIDER
        default:
            return nil
        }
    }
}
