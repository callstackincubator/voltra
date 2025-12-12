import SwiftUI

struct JSColorParser {
    /// Parses Hex, RGB, RGBA, HSL, HSLA, and named color strings into SwiftUI Color.
    static func parse(_ value: Any?) -> Color? {
        guard let string = value as? String else { return nil }
        
        // Optimize: standard trim and lowercase
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        if trimmed.isEmpty { return nil }
        
        // 1. Hex (with or without #)
        if trimmed.hasPrefix("#") {
            return parseHex(trimmed)
        }
        
        // Check for hex without # prefix (6 or 8 hex digits)
        if isHexColor(trimmed) {
            return parseHex("#" + trimmed)
        }
        
        // 2. RGB / RGBA
        if trimmed.hasPrefix("rgb") {
            return parseRGB(trimmed)
        }
        
        // 3. HSL / HSLA
        if trimmed.hasPrefix("hsl") {
            return parseHSL(trimmed)
        }
        
        // 4. Named colors
        if let namedColor = parseNamedColor(trimmed) {
            return namedColor
        }
        
        return nil
    }
    
    /// Check if a string is a valid hex color (6 or 8 hex digits)
    private static func isHexColor(_ string: String) -> Bool {
        guard string.count == 6 || string.count == 8 else { return false }
        // Check if all characters are valid hex digits (0-9, a-f)
        let hexChars = CharacterSet(charactersIn: "0123456789abcdef")
        return string.unicodeScalars.allSatisfy { hexChars.contains($0) }
    }
    
    /// Parse named color strings
    private static func parseNamedColor(_ name: String) -> Color? {
        switch name {
        case "red":
            return .red
        case "orange":
            return .orange
        case "yellow":
            return .yellow
        case "green":
            return .green
        case "mint":
            if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *) {
                return .mint
            }
            return .primary
        case "teal":
            if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *) {
                return .teal
            }
            return .primary
        case "cyan":
            if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *) {
                return .cyan
            }
            return .primary
        case "blue":
            return .blue
        case "indigo":
            if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *) {
                return .indigo
            }
            return .primary
        case "purple":
            return .purple
        case "pink":
            return .pink
        case "brown":
            if #available(iOS 15.0, macOS 12.0, tvOS 15.0, watchOS 8.0, *) {
                return .brown
            }
            return .primary
        case "white":
            return .white
        case "gray":
            return .gray
        case "black":
            return .black
        case "clear", "transparent":
            return .clear
        case "primary":
            return .primary
        case "secondary":
            return .secondary
        default:
            return nil
        }
    }
    
    // MARK: - Hex Parser
    // Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    private static func parseHex(_ hex: String) -> Color? {
        let hexSanitized = hex.replacingOccurrences(of: "#", with: "")
        
        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)
        
        let r, g, b, a: Double
        let length = hexSanitized.count
        
        switch length {
        case 3: // #RGB
            r = Double((rgb >> 8) & 0xF) / 15.0
            g = Double((rgb >> 4) & 0xF) / 15.0
            b = Double(rgb & 0xF) / 15.0
            a = 1.0
        case 4: // #RGBA
            r = Double((rgb >> 12) & 0xF) / 15.0
            g = Double((rgb >> 8) & 0xF) / 15.0
            b = Double((rgb >> 4) & 0xF) / 15.0
            a = Double(rgb & 0xF) / 15.0
        case 6: // #RRGGBB
            r = Double((rgb >> 16) & 0xFF) / 255.0
            g = Double((rgb >> 8) & 0xFF) / 255.0
            b = Double(rgb & 0xFF) / 255.0
            a = 1.0
        case 8: // #RRGGBBAA
            r = Double((rgb >> 24) & 0xFF) / 255.0
            g = Double((rgb >> 16) & 0xFF) / 255.0
            b = Double((rgb >> 8) & 0xFF) / 255.0
            a = Double(rgb & 0xFF) / 255.0
        default:
            return nil
        }
        
        return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
    
    // MARK: - RGB Parser
    // rgb(255, 0, 0) / rgba(255, 0, 0, 0.5)
    private static func parseRGB(_ string: String) -> Color? {
        let cleaned = string
            .replacingOccurrences(of: "rgba", with: "")
            .replacingOccurrences(of: "rgb", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .replacingOccurrences(of: " ", with: "")
        
        let components = cleaned.split(separator: ",")
        guard components.count >= 3 else { return nil }
        
        let r = Double(components[0]) ?? 0
        let g = Double(components[1]) ?? 0
        let b = Double(components[2]) ?? 0
        let a = components.count >= 4 ? (Double(components[3]) ?? 1.0) : 1.0
        
        return Color(.sRGB, red: r / 255.0, green: g / 255.0, blue: b / 255.0, opacity: a)
    }
    
    // MARK: - HSL Parser
    // hsl(120, 100%, 50%) / hsla(...)
    private static func parseHSL(_ string: String) -> Color? {
        let cleaned = string
            .replacingOccurrences(of: "hsla", with: "")
            .replacingOccurrences(of: "hsl", with: "")
            .replacingOccurrences(of: "(", with: "")
            .replacingOccurrences(of: ")", with: "")
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "%", with: "")
        
        let components = cleaned.split(separator: ",")
        guard components.count >= 3 else { return nil }
        
        let h = (Double(components[0]) ?? 0) / 360.0
        let s = (Double(components[1]) ?? 0) / 100.0
        let l = (Double(components[2]) ?? 0) / 100.0
        let a = components.count >= 4 ? (Double(components[3]) ?? 1.0) : 1.0
        
        return Color(hue: h, saturation: s, brightness: l, opacity: a)
    }
}