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
        var frameProps: [String: Any] = [:]
        var offsetProps: [String: Double] = [:]
        var opacity: Double?
        var overflow: String?
        var aspectRatio: Double?
        var flexGrowWidth: Bool = false
        var fixedSizeHorizontal: Bool = false
        var fixedSizeVertical: Bool = false
        var layoutPriority: Double?
        var zIndex: Double?
        var absolutePosition: [String: Double]?
        
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
            case "aspectRatio":
                if let num = value as? NSNumber {
                    aspectRatio = num.doubleValue
                }
            case "minWidth":
                if let num = value as? NSNumber {
                    frameProps["minWidth"] = num.doubleValue
                }
            case "maxWidth":
                if let num = value as? NSNumber {
                    frameProps["maxWidth"] = num.doubleValue
                } else if let str = value as? String, str == "infinity" {
                    frameProps["maxWidth"] = "infinity"
                }
            case "minHeight":
                if let num = value as? NSNumber {
                    frameProps["minHeight"] = num.doubleValue
                }
            case "maxHeight":
                if let num = value as? NSNumber {
                    frameProps["maxHeight"] = num.doubleValue
                } else if let str = value as? String, str == "infinity" {
                    frameProps["maxHeight"] = "infinity"
                }
            case "flexGrowWidth":
                if let bool = value as? Bool {
                    flexGrowWidth = bool
                }
            case "fixedSizeHorizontal":
                if let bool = value as? Bool {
                    fixedSizeHorizontal = bool
                }
            case "fixedSizeVertical":
                if let bool = value as? Bool {
                    fixedSizeVertical = bool
                }
            case "layoutPriority":
                if let num = value as? NSNumber {
                    layoutPriority = num.doubleValue
                }
            case "zIndex":
                if let num = value as? NSNumber {
                    zIndex = num.doubleValue
                }
            case "absolutePosition":
                if let pos = value as? [String: Any] {
                    var posDict: [String: Double] = [:]
                    if let x = pos["x"] as? NSNumber {
                        posDict["x"] = x.doubleValue
                    }
                    if let y = pos["y"] as? NSNumber {
                        posDict["y"] = y.doubleValue
                    }
                    if !posDict.isEmpty {
                        absolutePosition = posDict
                    }
                }
            case "offsetX":
                if let num = value as? NSNumber {
                    offsetProps["x"] = num.doubleValue
                }
            case "offsetY":
                if let num = value as? NSNumber {
                    offsetProps["y"] = num.doubleValue
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
        
        // 1. Aspect Ratio (Must be tightest to content)
        if let aspectRatio = aspectRatio {
            var aspectRatioArgs: [String: AnyCodable] = [:]
            aspectRatioArgs["ratio"] = .double(aspectRatio)
            modifiers.append(VoltraModifier(name: "aspectRatio", args: aspectRatioArgs))
        }
        
        // Process padding (applied first to style content)
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
        
        // 2. Main Frame & Constraints
        // First frame: width and height
        var mainFrameArgs: [String: AnyCodable] = [:]
        if let width = frameProps["width"] as? Double {
            mainFrameArgs["width"] = .double(width)
        }
        if let height = frameProps["height"] as? Double {
            mainFrameArgs["height"] = .double(height)
        }
        if !mainFrameArgs.isEmpty {
            modifiers.append(VoltraModifier(name: "frame", args: mainFrameArgs))
        }
        
        // Second frame: min/max constraints
        var constraintFrameArgs: [String: AnyCodable] = [:]
        if let minWidth = frameProps["minWidth"] as? Double {
            constraintFrameArgs["minWidth"] = .double(minWidth)
        }
        if let maxWidth = frameProps["maxWidth"] {
            if let num = maxWidth as? Double {
                constraintFrameArgs["maxWidth"] = .double(num)
            } else if let str = maxWidth as? String, str == "infinity" {
                constraintFrameArgs["maxWidth"] = .string("infinity")
            } else if flexGrowWidth {
                constraintFrameArgs["maxWidth"] = .string("infinity")
            }
        } else if flexGrowWidth {
            constraintFrameArgs["maxWidth"] = .string("infinity")
        }
        if let minHeight = frameProps["minHeight"] as? Double {
            constraintFrameArgs["minHeight"] = .double(minHeight)
        }
        if let maxHeight = frameProps["maxHeight"] {
            if let num = maxHeight as? Double {
                constraintFrameArgs["maxHeight"] = .double(num)
            } else if let str = maxHeight as? String, str == "infinity" {
                constraintFrameArgs["maxHeight"] = .string("infinity")
            }
        }
        if !constraintFrameArgs.isEmpty {
            modifiers.append(VoltraModifier(name: "frame", args: constraintFrameArgs))
        }
        
        // 3. Fixed Size (Force content expansion)
        if fixedSizeHorizontal || fixedSizeVertical {
            var fixedSizeArgs: [String: AnyCodable] = [:]
            fixedSizeArgs["horizontal"] = .bool(fixedSizeHorizontal)
            fixedSizeArgs["vertical"] = .bool(fixedSizeVertical)
            modifiers.append(VoltraModifier(name: "fixedSize", args: fixedSizeArgs))
        }
        
        // 4. Layout Priority (Resolves sibling contention)
        if let layoutPriority = layoutPriority {
            var priorityArgs: [String: AnyCodable] = [:]
            priorityArgs["value"] = .double(layoutPriority)
            modifiers.append(VoltraModifier(name: "layoutPriority", args: priorityArgs))
        }
        
        // 5. Positioning & Layers
        // Handle offset - fine-tunes position
        if !offsetProps.isEmpty {
            var offsetArgs: [String: AnyCodable] = [:]
            if let x = offsetProps["x"] {
                offsetArgs["x"] = .double(x)
            }
            if let y = offsetProps["y"] {
                offsetArgs["y"] = .double(y)
            }
            if !offsetArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "offset", args: offsetArgs))
            }
        }
        
        // zIndex
        if let zIndex = zIndex {
            var zIndexArgs: [String: AnyCodable] = [:]
            zIndexArgs["value"] = .double(zIndex)
            modifiers.append(VoltraModifier(name: "zIndex", args: zIndexArgs))
        }
        
        // 7. Absolute Position (Overrides everything else)
        if let absolutePosition = absolutePosition {
            var positionArgs: [String: AnyCodable] = [:]
            if let x = absolutePosition["x"] {
                positionArgs["x"] = .double(x)
            }
            if let y = absolutePosition["y"] {
                positionArgs["y"] = .double(y)
            }
            if !positionArgs.isEmpty {
                modifiers.append(VoltraModifier(name: "position", args: positionArgs))
            }
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

