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
  case LINEAR_PROGRESS_VIEW = 6
  case CIRCULAR_PROGRESS_VIEW = 7
  case GAUGE = 8
  case TIMER = 9
  case LINEAR_GRADIENT = 10
  case V_STACK = 11
  case H_STACK = 12
  case Z_STACK = 13
  case GROUP_BOX = 14
  case GLASS_CONTAINER = 15
  case SPACER = 16
  case DIVIDER = 17
  case MASK = 18

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
    case .GROUP_BOX:
      return "GroupBox"
    case .GLASS_CONTAINER:
      return "GlassContainer"
    case .SPACER:
      return "Spacer"
    case .DIVIDER:
      return "Divider"
    case .MASK:
      return "Mask"
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
    case "LinearProgressView": self = .LINEAR_PROGRESS_VIEW
    case "CircularProgressView": self = .CIRCULAR_PROGRESS_VIEW
    case "Gauge": self = .GAUGE
    case "Timer": self = .TIMER
    case "LinearGradient": self = .LINEAR_GRADIENT
    case "VStack": self = .V_STACK
    case "HStack": self = .H_STACK
    case "ZStack": self = .Z_STACK
    case "GroupBox": self = .GROUP_BOX
    case "GlassContainer": self = .GLASS_CONTAINER
    case "Spacer": self = .SPACER
    case "Divider": self = .DIVIDER
    case "Mask": self = .MASK
    default:
      return nil
    }
  }
}
