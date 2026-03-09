import SwiftUI

enum JSColorParser {
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

  // Supports:
  // - rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
  // - rgb(255 0 0 / 80%), rgba(255 0 0 / 0.8)
  private static func parseRGB(_ string: String) -> Color? {
    guard let function = parseFunctionCall(string, allowedNames: ["rgb", "rgba"]) else { return nil }

    let isRgba = function.name == "rgba"
    let parsed: (r: Double, g: Double, b: Double, a: Double)?
    if function.arguments.contains(",") {
      parsed = parseRGBCommaSyntax(arguments: function.arguments, expectsAlpha: isRgba)
    } else {
      parsed = parseRGBSpaceSyntax(arguments: function.arguments, expectsAlpha: isRgba)
    }
    guard let parsed else { return nil }

    return Color(.sRGB, red: parsed.r, green: parsed.g, blue: parsed.b, opacity: parsed.a)
  }

  // MARK: - HSL Parser

  // Supports:
  // - hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.5)
  // - hsl(120 100% 50% / 30%), hsla(120 100% 50% / 0.3)
  private static func parseHSL(_ string: String) -> Color? {
    guard let function = parseFunctionCall(string, allowedNames: ["hsl", "hsla"]) else { return nil }

    let isHsla = function.name == "hsla"
    let parsed: (h: Double, s: Double, l: Double, a: Double)?
    if function.arguments.contains(",") {
      parsed = parseHSLCommaSyntax(arguments: function.arguments, expectsAlpha: isHsla)
    } else {
      parsed = parseHSLSpaceSyntax(arguments: function.arguments, expectsAlpha: isHsla)
    }
    guard let parsed else { return nil }

    let h = parsed.h
    let s = parsed.s
    let l = parsed.l
    let a = parsed.a

    // Convert HSL to RGB (HSL != HSB/HSV)
    let (r, g, b) = hslToRgb(h: h, s: s, l: l)
    return Color(.sRGB, red: r, green: g, blue: b, opacity: a)
  }

  private struct FunctionCall {
    var name: String
    var arguments: String
  }

  private static func parseFunctionCall(_ input: String, allowedNames: Set<String>) -> FunctionCall? {
    let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    guard let open = trimmed.firstIndex(of: "("), trimmed.hasSuffix(")") else { return nil }

    let name = String(trimmed[..<open]).trimmingCharacters(in: .whitespacesAndNewlines)
    guard allowedNames.contains(name), !name.isEmpty else { return nil }

    let argsStart = trimmed.index(after: open)
    let argsEnd = trimmed.index(before: trimmed.endIndex)
    guard argsStart <= argsEnd else { return nil }

    let arguments = String(trimmed[argsStart..<argsEnd]).trimmingCharacters(in: .whitespacesAndNewlines)
    guard !arguments.isEmpty else { return nil }
    return FunctionCall(name: name, arguments: arguments)
  }

  private static func parseRGBCommaSyntax(arguments: String, expectsAlpha: Bool) -> (r: Double, g: Double, b: Double, a: Double)? {
    let parts = splitCommaSeparated(arguments)
    let expected = expectsAlpha ? 4 : 3
    guard parts.count == expected else { return nil }

    guard
      let r = parseRGBChannel(parts[0]),
      let g = parseRGBChannel(parts[1]),
      let b = parseRGBChannel(parts[2])
    else { return nil }

    let alpha: Double
    if expectsAlpha {
      guard let parsedAlpha = parseAlpha(parts[3]) else { return nil }
      alpha = parsedAlpha
    } else {
      alpha = 1.0
    }

    return (r, g, b, alpha)
  }

  private static func parseRGBSpaceSyntax(arguments: String, expectsAlpha: Bool) -> (r: Double, g: Double, b: Double, a: Double)? {
    let split = splitLeftAndOptionalAlpha(arguments)
    guard let split else { return nil }
    let channels = splitWhitespaceSeparated(split.left)
    guard channels.count == 3 else { return nil }

    guard
      let r = parseRGBChannel(channels[0]),
      let g = parseRGBChannel(channels[1]),
      let b = parseRGBChannel(channels[2])
    else { return nil }

    let alpha: Double
    if let alphaToken = split.alpha {
      guard let parsedAlpha = parseAlpha(alphaToken) else { return nil }
      alpha = parsedAlpha
    } else {
      guard !expectsAlpha else { return nil }
      alpha = 1.0
    }

    return (r, g, b, alpha)
  }

  private static func parseHSLCommaSyntax(arguments: String, expectsAlpha: Bool) -> (h: Double, s: Double, l: Double, a: Double)? {
    let parts = splitCommaSeparated(arguments)
    let expected = expectsAlpha ? 4 : 3
    guard parts.count == expected else { return nil }

    guard
      let h = parseHue(parts[0]),
      let s = parsePercentage(parts[1]),
      let l = parsePercentage(parts[2])
    else { return nil }

    let alpha: Double
    if expectsAlpha {
      guard let parsedAlpha = parseAlpha(parts[3]) else { return nil }
      alpha = parsedAlpha
    } else {
      alpha = 1.0
    }

    return (h, s, l, alpha)
  }

  private static func parseHSLSpaceSyntax(arguments: String, expectsAlpha: Bool) -> (h: Double, s: Double, l: Double, a: Double)? {
    let split = splitLeftAndOptionalAlpha(arguments)
    guard let split else { return nil }
    let channels = splitWhitespaceSeparated(split.left)
    guard channels.count == 3 else { return nil }

    guard
      let h = parseHue(channels[0]),
      let s = parsePercentage(channels[1]),
      let l = parsePercentage(channels[2])
    else { return nil }

    let alpha: Double
    if let alphaToken = split.alpha {
      guard let parsedAlpha = parseAlpha(alphaToken) else { return nil }
      alpha = parsedAlpha
    } else {
      guard !expectsAlpha else { return nil }
      alpha = 1.0
    }

    return (h, s, l, alpha)
  }

  private static func splitCommaSeparated(_ arguments: String) -> [String] {
    let parts = arguments
      .split(separator: ",", omittingEmptySubsequences: false)
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    if parts.contains(where: \.isEmpty) {
      return []
    }
    return parts
  }

  private static func splitWhitespaceSeparated(_ input: String) -> [String] {
    input
      .split { $0.isWhitespace }
      .map(String.init)
      .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
      .filter { !$0.isEmpty }
  }

  private static func splitLeftAndOptionalAlpha(_ arguments: String) -> (left: String, alpha: String?)? {
    let parts = arguments.split(separator: "/", omittingEmptySubsequences: false).map {
      $0.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    guard (1...2).contains(parts.count) else { return nil }
    guard let left = parts.first, !left.isEmpty else { return nil }

    if parts.count == 1 {
      return (left, nil)
    }

    let alpha = parts[1]
    guard !alpha.isEmpty else { return nil }
    return (left, alpha)
  }

  private static func parseRGBChannel(_ token: String) -> Double? {
    if token.hasSuffix("%") {
      guard let pct = Double(token.dropLast()) else { return nil }
      return clamp01(pct / 100.0)
    }
    guard let value = Double(token) else { return nil }
    return clamp01(value / 255.0)
  }

  private static func parsePercentage(_ token: String) -> Double? {
    guard token.hasSuffix("%"), let value = Double(token.dropLast()) else { return nil }
    return clamp01(value / 100.0)
  }

  private static func parseAlpha(_ token: String) -> Double? {
    if token.hasSuffix("%") {
      guard let pct = Double(token.dropLast()) else { return nil }
      return clamp01(pct / 100.0)
    }
    guard let value = Double(token) else { return nil }
    return clamp01(value)
  }

  private static func parseHue(_ token: String) -> Double? {
    let normalized: Double?
    if token.hasSuffix("deg"), let value = Double(token.dropLast(3)) {
      normalized = value / 360.0
    } else if token.hasSuffix("rad"), let value = Double(token.dropLast(3)) {
      normalized = value / (2 * .pi)
    } else if token.hasSuffix("turn"), let value = Double(token.dropLast(4)) {
      normalized = value
    } else {
      normalized = Double(token).map { $0 / 360.0 }
    }

    guard let value = normalized else { return nil }
    return normalizeUnit(value)
  }

  private static func clamp01(_ value: Double) -> Double {
    Swift.max(0, Swift.min(1, value))
  }

  private static func normalizeUnit(_ value: Double) -> Double {
    var result = value.truncatingRemainder(dividingBy: 1)
    if result < 0 { result += 1 }
    return result
  }

  /// Convert HSL to RGB
  /// - Parameters:
  ///   - h: Hue (0.0 to 1.0)
  ///   - s: Saturation (0.0 to 1.0)
  ///   - l: Lightness (0.0 to 1.0)
  /// - Returns: RGB tuple with values from 0.0 to 1.0
  private static func hslToRgb(h: Double, s: Double, l: Double) -> (r: Double, g: Double, b: Double) {
    // Achromatic case (no saturation)
    if s == 0 {
      return (l, l, l)
    }

    let q = l < 0.5 ? l * (1 + s) : l + s - l * s
    let p = 2 * l - q

    let r = hueToRgb(p: p, q: q, t: h + 1.0 / 3.0)
    let g = hueToRgb(p: p, q: q, t: h)
    let b = hueToRgb(p: p, q: q, t: h - 1.0 / 3.0)

    return (r, g, b)
  }

  /// Helper function for HSL to RGB conversion
  private static func hueToRgb(p: Double, q: Double, t: Double) -> Double {
    var t = t
    if t < 0 { t += 1 }
    if t > 1 { t -= 1 }

    if t < 1.0 / 6.0 { return p + (q - p) * 6 * t }
    if t < 1.0 / 2.0 { return q }
    if t < 2.0 / 3.0 { return p + (q - p) * (2.0 / 3.0 - t) * 6 }
    return p
  }
}
