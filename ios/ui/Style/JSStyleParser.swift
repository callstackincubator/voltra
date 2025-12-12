import SwiftUI

struct JSStyleParser {
    static func number(_ value: Any?) -> CGFloat? {
        if let v = value as? CGFloat { return v }
        if let v = value as? Double { return CGFloat(v) }
        if let v = value as? Int { return CGFloat(v) }
        // Handle "20.5" strings if necessary, though rarer in raw JSON objects
        return nil
    }

    static func size(_ value: Any?) -> CGSize? {
        guard let dict = value as? [String: Any] else { return nil }
        let w = number(dict["width"]) ?? 0
        let h = number(dict["height"]) ?? 0
        return CGSize(width: w, height: h)
    }
    
    static func color(_ value: Any?) -> Color? {
        return JSColorParser.parse(value)
    }
    
    static func boolean(_ value: Any?) -> Bool {
        guard let value = value else { return false }
        
        if let bool = value as? Bool { return bool }
        if let int = value as? Int { return int == 1 }
        if let string = value as? String {
            return string.lowercased() == "true"
        }
        
        return false
    }

    // Helper to resolve CSS Edge Precedence: 
    // Specific (Left) > Axis (Horizontal) > Generic (All)
    static func parseInsets(from dict: [String: Any], prefix: String) -> EdgeInsets {
        let all = number(dict[prefix]) ?? 0
        let v = number(dict["\(prefix)Vertical"]) ?? all
        let h = number(dict["\(prefix)Horizontal"]) ?? all
        
        return EdgeInsets(
            top: number(dict["\(prefix)Top"]) ?? v,
            leading: number(dict["\(prefix)Left"]) ?? number(dict["\(prefix)Start"]) ?? h,
            bottom: number(dict["\(prefix)Bottom"]) ?? v,
            trailing: number(dict["\(prefix)Right"]) ?? number(dict["\(prefix)End"]) ?? h
        )
    }

    // Maps "bold", "600", "normal" -> Font.Weight
    static func fontWeight(_ value: Any?) -> Font.Weight {
        guard let string = value as? String else { return .regular }
        
        switch string.lowercased() {
        case "bold", "700": return .bold
        case "heavy", "800", "900": return .heavy // or .black
        case "semibold", "600": return .semibold
        case "medium", "500": return .medium
        case "light", "300": return .light
        case "thin", "100": return .thin
        default: return .regular
        }
    }
    
    // Maps "center", "right", "justify" -> TextAlignment
    static func textAlignment(_ value: Any?) -> TextAlignment {
        guard let string = value as? String else { return .leading }
        
        switch string.lowercased() {
        case "center": return .center
        case "right", "end": return .trailing
        default: return .leading
        }
    }

    static func textDecoration(_ value: Any?) -> TextDecoration {
        guard let string = (value as? String)?.lowercased() else { return .none }
        
        // Simple string check (RN allows "underline line-through")
        let hasUnderline = string.contains("underline")
        let hasLineThrough = string.contains("line-through") || string.contains("strikethrough")
        
        if hasUnderline && hasLineThrough { return .underlineLineThrough }
        if hasUnderline { return .underline }
        if hasLineThrough { return .lineThrough }
        return .none
    }
    
    static func glassEffect(_ value: Any?) -> GlassEffect? {
        guard let string = (value as? String)?.lowercased() else { return nil }
        
        switch string {
            case "clear": return .clear
            case "identity": return .identity
            case "regular": return .regular
            case "none": return .none
            default: return nil
        }
    }

    static func overflow(_ value: Any?) -> Overflow? {
        guard let string = (value as? String)?.lowercased() else { return nil }
        
        if string == "hidden" { return .hidden }
        if string == "visible" { return .visible }
        return nil
    }
    
    static func fontVariant(_ value: Any?) -> Set<FontVariant> {
        var variants: Set<FontVariant> = []
        
        // Handle array of strings (e.g., ["small-caps", "tabular-nums"])
        if let array = value as? [String] {
            for variantString in array {
                if let variant = FontVariant(rawValue: variantString) {
                    variants.insert(variant)
                }
            }
        }
        // Handle single string (e.g., "small-caps")
        else if let string = value as? String {
            if let variant = FontVariant(rawValue: string) {
                variants.insert(variant)
            }
        }
        
        return variants
    }
    
    /// Parse RN transform array: [{ rotate: '45deg' }, { scale: 1.5 }]
    static func transform(_ value: Any?) -> TransformStyle? {
        guard let array = value as? [[String: Any]] else { return nil }
        
        var transform = TransformStyle()
        
        for item in array {
            // Handle rotate: '45deg' or rotate: '0.785rad'
            if let rotateStr = item["rotate"] as? String {
                transform.rotate = parseAngle(rotateStr)
            }
            // Handle rotateZ (same as rotate for 2D)
            if let rotateZStr = item["rotateZ"] as? String {
                transform.rotate = parseAngle(rotateZStr)
            }
            // Handle scale
            if let scale = item["scale"] as? Double {
                transform.scale = CGFloat(scale)
            } else if let scale = item["scale"] as? Int {
                transform.scale = CGFloat(scale)
            }
            // Handle scaleX
            if let scaleX = item["scaleX"] as? Double {
                transform.scaleX = CGFloat(scaleX)
            } else if let scaleX = item["scaleX"] as? Int {
                transform.scaleX = CGFloat(scaleX)
            }
            // Handle scaleY
            if let scaleY = item["scaleY"] as? Double {
                transform.scaleY = CGFloat(scaleY)
            } else if let scaleY = item["scaleY"] as? Int {
                transform.scaleY = CGFloat(scaleY)
            }
        }
        
        return transform.hasTransforms ? transform : nil
    }
    
    /// Parse angle string like '45deg' or '0.785rad' to degrees
    private static func parseAngle(_ value: String) -> CGFloat? {
        let trimmed = value.trimmingCharacters(in: .whitespaces)
        
        if trimmed.hasSuffix("deg") {
            let numStr = String(trimmed.dropLast(3))
            return Double(numStr).map { CGFloat($0) }
        } else if trimmed.hasSuffix("rad") {
            let numStr = String(trimmed.dropLast(3))
            if let radians = Double(numStr) {
                return CGFloat(radians * 180.0 / .pi) // Convert to degrees
            }
        }
        // Try parsing as plain number (assume degrees)
        return Double(trimmed).map { CGFloat($0) }
    }
}

/// Parsed transform style from RN transform array
struct TransformStyle {
    var rotate: CGFloat? // in degrees
    var scale: CGFloat?
    var scaleX: CGFloat?
    var scaleY: CGFloat?
    
    var hasTransforms: Bool {
        rotate != nil || scale != nil || scaleX != nil || scaleY != nil
    }
}
