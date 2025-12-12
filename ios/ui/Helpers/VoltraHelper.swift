import SwiftUI

// swiftlint:disable cyclomatic_complexity function_body_length
/// VoltraHelper
///
/// VoltraHelper helps to translate Strings to native SwiftUI .context
public class VoltraHelper {

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
