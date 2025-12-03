import SwiftUI

// swiftlint:disable cyclomatic_complexity function_body_length
/// VoltraHelper
///
/// VoltraHelper helps to translate Strings to native SwiftUI .context
public class VoltraHelper {

    /// Translate string colors to native ``Color``.
    ///
    /// - Parameter input: Color as string
    ///
    /// - Returns: SwiftUI ``Color``
    public func translateColor(_ input: String) -> Color? {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)

        // Support hex colors like #RRGGBB or #RRGGBBAA (and also without #)
        let lower = trimmed.lowercased()
        var hex = lower
        if hex.hasPrefix("#") {
            hex.removeFirst()
        }
        if hex.count == 6 || hex.count == 8, let value = UInt64(hex, radix: 16) {
            if hex.count == 8 {
                // RRGGBBAA
                let r = Double((value >> 24) & 0xff) / 255.0
                let g = Double((value >> 16) & 0xff) / 255.0
                let b = Double((value >> 8) & 0xff) / 255.0
                let a = Double((value >> 0) & 0xff) / 255.0
                return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
            } else {
                // RRGGBB
                let r = Double((value >> 16) & 0xff) / 255.0
                let g = Double((value >> 8) & 0xff) / 255.0
                let b = Double((value >> 0) & 0xff) / 255.0
                return Color(.sRGB, red: r, green: g, blue: b, opacity: 1.0)
            }
        }

        switch lower {
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

        case "clear":
            return .clear

        case "primary":
            return .primary

        case "secondary":
            return .secondary

        default:
            // Unknown color string – don't force a color
            return nil
        }
    }

    /// Translate a string font weight to a native ``Font.Weight``
    ///
    /// - Parameter input: Font weight as string
    /// 
    /// - Returns: Translated ``Font.Weight``
    func translateFontWeight(_ input: String) -> Font.Weight? {
        let lower = input.lowercased()
        switch lower {
        case "ultraLight":
            return .ultraLight

        case "thin":
            return .thin

        case "light":
            return .light

        case "regular":
            return .regular

        case "medium":
            return .medium

        case "semibold":
            return .semibold

        case "bold":
            return .bold

        case "heavy":
            return .heavy

        case "black":
            return .black

        default:
            // Map numeric CSS-like weights to SwiftUI equivalents
            if let numeric = Int(lower) {
                switch numeric {
                case ..<150:
                    return .ultraLight
                case 150..<250:
                    return .thin
                case 250..<350:
                    return .light
                case 350..<450:
                    return .regular
                case 450..<550:
                    return .medium
                case 550..<650:
                    return .semibold
                case 650..<800:
                    return .bold
                case 800..<900:
                    return .heavy
                default:
                    return .black
                }
            }
            return .regular
        }
    }
}

// swiftlint:enable cyclomatic_complexity function_body_length
