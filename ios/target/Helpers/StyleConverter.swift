import Foundation
import SwiftUI

/// Converts React Native style objects to Voltra modifiers
public struct StyleConverter {
    private let helper = VoltraHelper()
    
    /// Convert style dictionary to modifiers array
    /// - Parameter style: Style dictionary with expanded property names
    /// - Returns: Array of modifiers in correct application order
    public func getModifiersFromStyle(_ style: [String: Any]) -> [VoltraModifier] {
        var modifiers: [VoltraModifier] = []
        
        // Collect properties
        var paddingProps: [String: Double] = [:]
        var marginProps: [String: Double] = [:]
        var borderProps: [String: Any] = [:]
        var shadowProps: [String: Any] = [:]
        var backgroundColor: String?
        var flexGrow: Double?
        var flexShrink: Double?
        var frameProps: [String: Any] = [:]
        var positionProps: [String: Double] = [:]
        var opacity: Double?
        var overflow: String?
        
        // Text-specific properties
        var fontSize: Double?
        var fontWeight: String?
        var color: String?
        var letterSpacing: Double?
        var fontVariant: [String]?
        
        // Process all style properties
        for (key, value) in style {
            switch key {
            case "width":
                if let num = value as? NSNumber {
                    frameProps["width"] = num.doubleValue
                }
            case "height":
                if let num = value as? NSNumber {
                    frameProps["height"] = num.doubleValue
                }
            case "padding":
                if let num = value as? NSNumber {
                    paddingProps["all"] = num.doubleValue
                }
            case "paddingTop":
                if let num = value as? NSNumber {
                    paddingProps["top"] = num.doubleValue
                }
            case "paddingBottom":
                if let num = value as? NSNumber {
                    paddingProps["bottom"] = num.doubleValue
                }
            case "paddingLeft":
                if let num = value as? NSNumber {
                    paddingProps["leading"] = num.doubleValue
                }
            case "paddingRight":
                if let num = value as? NSNumber {
                    paddingProps["trailing"] = num.doubleValue
                }
            case "paddingHorizontal":
                if let num = value as? NSNumber {
                    paddingProps["horizontal"] = num.doubleValue
                }
            case "paddingVertical":
                if let num = value as? NSNumber {
                    paddingProps["vertical"] = num.doubleValue
                }
            case "margin":
                if let num = value as? NSNumber {
                    marginProps["all"] = num.doubleValue
                }
            case "marginTop":
                if let num = value as? NSNumber {
                    marginProps["top"] = num.doubleValue
                }
            case "marginBottom":
                if let num = value as? NSNumber {
                    marginProps["bottom"] = num.doubleValue
                }
            case "marginLeft":
                if let num = value as? NSNumber {
                    marginProps["leading"] = num.doubleValue
                }
            case "marginRight":
                if let num = value as? NSNumber {
                    marginProps["trailing"] = num.doubleValue
                }
            case "marginHorizontal":
                if let num = value as? NSNumber {
                    marginProps["horizontal"] = num.doubleValue
                }
            case "marginVertical":
                if let num = value as? NSNumber {
                    marginProps["vertical"] = num.doubleValue
                }
            case "backgroundColor":
                backgroundColor = value as? String
            case "opacity":
                if let num = value as? NSNumber {
                    opacity = num.doubleValue
                }
            case "borderRadius":
                borderProps["borderRadius"] = value
            case "borderWidth":
                borderProps["borderWidth"] = value
            case "borderColor":
                borderProps["borderColor"] = value
            case "shadowColor":
                shadowProps["shadowColor"] = value
            case "shadowOffset":
                shadowProps["shadowOffset"] = value
            case "shadowOpacity":
                shadowProps["shadowOpacity"] = value
            case "shadowRadius":
                shadowProps["shadowRadius"] = value
            case "overflow":
                overflow = value as? String
            case "flex":
                if let num = value as? NSNumber {
                    let flexValue = num.doubleValue
                    if flexValue > 0 {
                        flexGrow = flexValue
                    } else if flexValue < 0 {
                        flexShrink = abs(flexValue)
                    }
                }
            case "flexGrow":
                if let num = value as? NSNumber, num.doubleValue > 0 {
                    flexGrow = num.doubleValue
                }
            case "flexShrink":
                if let num = value as? NSNumber, num.doubleValue > 0 {
                    flexShrink = num.doubleValue
                }
            case "position":
                if let pos = value as? String {
                    positionProps["position"] = pos == "absolute" ? 1 : 0
                }
            case "top":
                if let num = value as? NSNumber {
                    positionProps["top"] = num.doubleValue
                }
            case "left":
                if let num = value as? NSNumber {
                    positionProps["left"] = num.doubleValue
                }
            case "right":
                if let num = value as? NSNumber {
                    positionProps["right"] = num.doubleValue
                }
            case "bottom":
                if let num = value as? NSNumber {
                    positionProps["bottom"] = num.doubleValue
                }
            // Text properties
            case "fontSize":
                if let num = value as? NSNumber {
                    fontSize = num.doubleValue
                }
            case "fontWeight":
                fontWeight = value as? String
            case "color":
                color = value as? String
            case "letterSpacing":
                if let num = value as? NSNumber {
                    letterSpacing = num.doubleValue
                }
            case "fontVariant":
                if let arr = value as? [String] {
                    fontVariant = arr
                }
            default:
                break
            }
        }
        
        // Process flex properties and update frame
        if let flexGrow = flexGrow, flexGrow > 0 {
            if let width = frameProps["width"] as? Double {
                frameProps["idealWidth"] = width
                frameProps.removeValue(forKey: "width")
                frameProps["maxWidth"] = "infinity"
            } else {
                frameProps["maxWidth"] = "infinity"
            }
            if let height = frameProps["height"] as? Double {
                frameProps["idealHeight"] = height
                frameProps.removeValue(forKey: "height")
                frameProps["maxHeight"] = "infinity"
            } else {
                frameProps["maxHeight"] = "infinity"
            }
            frameProps["minWidth"] = 0.0
            frameProps["minHeight"] = 0.0
        } else if flexGrow == 0 {
            // Don't allow growing
            if frameProps["maxWidth"] as? String == "infinity" {
                frameProps.removeValue(forKey: "maxWidth")
            }
            if frameProps["maxHeight"] as? String == "infinity" {
                frameProps.removeValue(forKey: "maxHeight")
            }
        }
        
        if let flexShrink = flexShrink, flexShrink > 0 {
            frameProps["minWidth"] = 0.0
            frameProps["minHeight"] = 0.0
        }
        
        // Add frame modifier if needed
        if !frameProps.isEmpty {
            var frameArgs: [String: AnyCodable] = [:]
            for (key, value) in frameProps {
                if let num = value as? Double {
                    frameArgs[key] = .double(num)
                } else if let str = value as? String {
                    frameArgs[key] = .string(str)
                }
            }
            modifiers.append(VoltraModifier(name: "frame", args: frameArgs))
        }
        
        // Handle position
        if let position = positionProps["position"], position == 1 {
            // Absolute positioning
            if let top = positionProps["top"], let left = positionProps["left"] {
                var positionArgs: [String: AnyCodable] = [:]
                positionArgs["x"] = .double(left)
                positionArgs["y"] = .double(top)
                modifiers.append(VoltraModifier(name: "position", args: positionArgs))
            }
        } else if let position = positionProps["position"], position == 0 {
            // Relative positioning (offset)
            var offsetArgs: [String: AnyCodable] = [:]
            if let left = positionProps["left"] {
                offsetArgs["x"] = .double(left)
            }
            if let top = positionProps["top"] {
                offsetArgs["y"] = .double(top)
            }
            if !offsetArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "offset", args: offsetArgs))
            }
        }
        
        // Process padding (must come first)
        if !paddingProps.isEmpty {
            var paddingArgs: [String: AnyCodable] = [:]
            
            if let all = paddingProps["all"] {
                paddingArgs["all"] = .double(all)
            } else {
                if let top = paddingProps["top"] {
                    paddingArgs["top"] = .double(top)
                }
                if let bottom = paddingProps["bottom"] {
                    paddingArgs["bottom"] = .double(bottom)
                }
                
                // Handle horizontal padding with RTL awareness
                // Note: RTL detection would need to be passed in or detected differently in Swift
                // For now, we'll use leading/trailing based on paddingLeft/paddingRight
                if let leading = paddingProps["leading"] {
                    paddingArgs["leading"] = .double(leading)
                }
                if let trailing = paddingProps["trailing"] {
                    paddingArgs["trailing"] = .double(trailing)
                }
                
                // Handle horizontal/vertical shortcuts
                if let horizontal = paddingProps["horizontal"] {
                    if paddingArgs["leading"] == nil && paddingArgs["trailing"] == nil {
                        paddingArgs["leading"] = .double(horizontal)
                        paddingArgs["trailing"] = .double(horizontal)
                    }
                }
                if let vertical = paddingProps["vertical"] {
                    if paddingArgs["top"] == nil && paddingArgs["bottom"] == nil {
                        paddingArgs["top"] = .double(vertical)
                        paddingArgs["bottom"] = .double(vertical)
                    }
                }
            }
            
            if !paddingArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "padding", args: paddingArgs))
            }
        }
        
        // Add background (after padding)
        if let bgColor = backgroundColor {
            var bgArgs: [String: AnyCodable] = [:]
            bgArgs["color"] = .string(bgColor)
            modifiers.append(VoltraModifier(name: "background", args: bgArgs))
        }
        
        // Handle borderRadius and border
        let hasBorderWidth = (borderProps["borderWidth"] as? NSNumber)?.doubleValue ?? 0 > 0
        let hasBorderColor = borderProps["borderColor"] != nil
        let hasBorder = hasBorderWidth || hasBorderColor
        
        if let borderRadius = borderProps["borderRadius"] as? NSNumber {
            if !hasBorder {
                // Add as separate cornerRadius modifier
                var crArgs: [String: AnyCodable] = [:]
                crArgs["radius"] = .double(borderRadius.doubleValue)
                modifiers.append(VoltraModifier(name: "cornerRadius", args: crArgs))
            }
        }
        
        // Add border modifier (includes borderRadius if border exists)
        if hasBorder {
            var borderArgs: [String: AnyCodable] = [:]
            if let width = borderProps["borderWidth"] as? NSNumber {
                borderArgs["width"] = .double(width.doubleValue)
            }
            if let color = borderProps["borderColor"] as? String {
                borderArgs["color"] = .string(color)
            }
            if let borderRadius = borderProps["borderRadius"] as? NSNumber {
                borderArgs["cornerRadius"] = .double(borderRadius.doubleValue)
            }
            if !borderArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "border", args: borderArgs))
            }
        }
        
        // Add shadow modifier
        if !shadowProps.isEmpty {
            var shadowArgs: [String: AnyCodable] = [:]
            if let color = shadowProps["shadowColor"] as? String {
                shadowArgs["color"] = .string(color)
            }
            if let opacity = shadowProps["shadowOpacity"] as? NSNumber {
                shadowArgs["opacity"] = .double(opacity.doubleValue)
            }
            if let radius = shadowProps["shadowRadius"] as? NSNumber {
                shadowArgs["radius"] = .double(radius.doubleValue)
            }
            if let offset = shadowProps["shadowOffset"] as? [String: Any] {
                if let width = offset["width"] as? NSNumber {
                    shadowArgs["x"] = .double(width.doubleValue)
                }
                if let height = offset["height"] as? NSNumber {
                    shadowArgs["y"] = .double(height.doubleValue)
                }
            }
            if !shadowArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "shadow", args: shadowArgs))
            }
        }
        
        // Add opacity modifier
        if let opacity = opacity {
            var opacityArgs: [String: AnyCodable] = [:]
            opacityArgs["value"] = .double(opacity)
            modifiers.append(VoltraModifier(name: "opacity", args: opacityArgs))
        }
        
        // Add clipped modifier
        if overflow == "hidden" {
            var clippedArgs: [String: AnyCodable] = [:]
            clippedArgs["enabled"] = .bool(true)
            modifiers.append(VoltraModifier(name: "clipped", args: clippedArgs))
        }
        
        // Process margin as padding (applied last)
        if !marginProps.isEmpty {
            var marginPaddingArgs: [String: AnyCodable] = [:]
            
            if let all = marginProps["all"] {
                marginPaddingArgs["all"] = .double(all)
            } else {
                if let top = marginProps["top"] {
                    marginPaddingArgs["top"] = .double(top)
                }
                if let bottom = marginProps["bottom"] {
                    marginPaddingArgs["bottom"] = .double(bottom)
                }
                
                if let leading = marginProps["leading"] {
                    marginPaddingArgs["leading"] = .double(leading)
                }
                if let trailing = marginProps["trailing"] {
                    marginPaddingArgs["trailing"] = .double(trailing)
                }
                
                if let horizontal = marginProps["horizontal"] {
                    if marginPaddingArgs["leading"] == nil && marginPaddingArgs["trailing"] == nil {
                        marginPaddingArgs["leading"] = .double(horizontal)
                        marginPaddingArgs["trailing"] = .double(horizontal)
                    }
                }
                if let vertical = marginProps["vertical"] {
                    if marginPaddingArgs["top"] == nil && marginPaddingArgs["bottom"] == nil {
                        marginPaddingArgs["top"] = .double(vertical)
                        marginPaddingArgs["bottom"] = .double(vertical)
                    }
                }
            }
            
            if !marginPaddingArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "padding", args: marginPaddingArgs))
            }
        }
        
        // Text-specific modifiers (should be applied early, so we'll prepend them)
        var textModifiers: [VoltraModifier] = []
        
        // Process font variants
        var hasSmallCaps = false
        var hasMonospacedDigit = false
        if let variants = fontVariant {
            for variant in variants {
                if variant == "small-caps" {
                    hasSmallCaps = true
                } else if variant == "tabular-nums" {
                    hasMonospacedDigit = true
                }
            }
        }
        
        // Font modifier (combines fontSize, fontWeight, and font variants)
        if fontSize != nil || hasSmallCaps || hasMonospacedDigit {
            var fontArgs: [String: AnyCodable] = [:]
            fontArgs["size"] = .double(fontSize ?? 17)
            if let weight = fontWeight {
                fontArgs["weight"] = .string(weight)
            }
            if hasSmallCaps {
                fontArgs["smallCaps"] = .bool(true)
            }
            if hasMonospacedDigit {
                fontArgs["monospacedDigit"] = .bool(true)
            }
            textModifiers.append(VoltraModifier(name: "font", args: fontArgs))
        } else if fontWeight != nil {
            // Only fontWeight
            var fwArgs: [String: AnyCodable] = [:]
            fwArgs["weight"] = .string(fontWeight!)
            textModifiers.append(VoltraModifier(name: "fontWeight", args: fwArgs))
        }
        
        // Foreground style (text color)
        if let textColor = color {
            var fgArgs: [String: AnyCodable] = [:]
            fgArgs["color"] = .string(textColor)
            textModifiers.append(VoltraModifier(name: "foregroundStyle", args: fgArgs))
        }
        
        // Kerning (letter spacing)
        if let spacing = letterSpacing {
            var kernArgs: [String: AnyCodable] = [:]
            kernArgs["value"] = .double(spacing)
            textModifiers.append(VoltraModifier(name: "kerning", args: kernArgs))
        }
        
        // Prepend text modifiers (they should be applied early)
        return textModifiers + modifiers
    }
}

