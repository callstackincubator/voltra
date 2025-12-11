import SwiftUI

struct JSColorParser {
    /// Parses Hex, RGB, RGBA, HSL, and HSLA strings into SwiftUI Color.
    static func parse(_ value: Any?) -> Color? {
        guard let string = value as? String else { return nil }
        
        // Optimize: standard trim and lowercase
        let trimmed = string.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        
        if trimmed.isEmpty { return nil }
        
        // 1. Hex
        if trimmed.hasPrefix("#") {
            return parseHex(trimmed)
        }
        
        // 2. RGB / RGBA
        if trimmed.hasPrefix("rgb") {
            return parseRGB(trimmed)
        }
        
        // 3. HSL / HSLA
        if trimmed.hasPrefix("hsl") {
            return parseHSL(trimmed)
        }
        
        // "transparent" check
        if trimmed == "transparent" { return .clear }
        
        return nil
    }
    
    // MARK: - Hex Parser
    // Supports #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    private static func parseHex(_ hex: String) -> Color? {
        var hexSanitized = hex.replacingOccurrences(of: "#", with: "")
        
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