import SwiftUI

enum JSGradientParser {
  static func parse(_ input: String) -> BackgroundValue? {
    let s = input.trimmingCharacters(in: .whitespacesAndNewlines)

    if s.hasPrefix("linear-gradient(") {
      return parseLinear(s)
    } else if s.hasPrefix("radial-gradient(") {
      return parseRadial(s)
    } else if s.hasPrefix("conic-gradient(") {
      return parseConic(s)
    }
    return nil
  }

  // MARK: - Gradient type parsers

  private static func parseLinear(_ s: String) -> BackgroundValue? {
    guard let content = extractContent(s, prefix: "linear-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard !args.isEmpty else { return nil }

    var startPoint = UnitPoint.top
    var endPoint = UnitPoint.bottom
    var stopArgs = args

    let first = args[0].trimmingCharacters(in: .whitespaces)

    if first.hasPrefix("to ") {
      let (sp, ep) = parseToDirection(first)
      startPoint = sp
      endPoint = ep
      stopArgs = Array(args.dropFirst())
    } else if first.hasSuffix("deg") {
      if let degrees = parseDegrees(first) {
        let (sp, ep) = angleToPoints(degrees)
        startPoint = sp
        endPoint = ep
        stopArgs = Array(args.dropFirst())
      }
    }

    let stops = parseStops(stopArgs)
    guard stops.count >= 2 else { return nil }
    return .linearGradient(gradient: Gradient(stops: stops), startPoint: startPoint, endPoint: endPoint)
  }

  private static func parseRadial(_ s: String) -> BackgroundValue? {
    guard let content = extractContent(s, prefix: "radial-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard args.count >= 2 else { return nil }

    // CSS radial-gradient first arg can be shape/size keywords — skip if not a color
    var stopArgs = args
    let first = args[0].trimmingCharacters(in: .whitespaces)
    if !looksLikeColor(first) {
      stopArgs = Array(args.dropFirst())
    }

    let stops = parseStops(stopArgs)
    guard stops.count >= 2 else { return nil }
    return .radialGradient(gradient: Gradient(stops: stops), center: .center, startRadius: 0, endRadius: 200)
  }

  private static func parseConic(_ s: String) -> BackgroundValue? {
    guard let content = extractContent(s, prefix: "conic-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard !args.isEmpty else { return nil }

    var angle = Angle.zero
    var stopArgs = args

    let first = args[0].trimmingCharacters(in: .whitespaces)
    if first.hasPrefix("from ") {
      let angleStr = String(first.dropFirst(5)).trimmingCharacters(in: .whitespaces)
      if let degrees = parseDegrees(angleStr) {
        angle = Angle(degrees: Double(degrees))
      }
      stopArgs = Array(args.dropFirst())
    }

    let stops = parseStops(stopArgs)
    guard stops.count >= 2 else { return nil }
    return .angularGradient(gradient: Gradient(stops: stops), center: .center, angle: angle)
  }

  // MARK: - Helpers

  static func extractContent(_ s: String, prefix: String) -> String? {
    guard s.hasPrefix(prefix), s.hasSuffix(")") else { return nil }
    let inner = String(s.dropFirst(prefix.count).dropLast())
    return inner
  }

  static func splitGradientArgs(_ content: String) -> [String] {
    var result: [String] = []
    var current = ""
    var depth = 0
    for char in content {
      if char == "(" { depth += 1 }
      else if char == ")" { depth -= 1 }
      if char == ",", depth == 0 {
        result.append(current.trimmingCharacters(in: .whitespaces))
        current = ""
      } else {
        current.append(char)
      }
    }
    if !current.trimmingCharacters(in: .whitespaces).isEmpty {
      result.append(current.trimmingCharacters(in: .whitespaces))
    }
    return result
  }

  private static func parseToDirection(_ s: String) -> (UnitPoint, UnitPoint) {
    switch s {
    case "to right": return (.leading, .trailing)
    case "to left": return (.trailing, .leading)
    case "to bottom": return (.top, .bottom)
    case "to top": return (.bottom, .top)
    case "to bottom right", "to right bottom": return (.topLeading, .bottomTrailing)
    case "to bottom left", "to left bottom": return (.topTrailing, .bottomLeading)
    case "to top right", "to right top": return (.bottomLeading, .topTrailing)
    case "to top left", "to left top": return (.bottomTrailing, .topLeading)
    default: return (.top, .bottom)
    }
  }

  static func angleToPoints(_ degrees: CGFloat) -> (UnitPoint, UnitPoint) {
    let radians = (degrees - 90) * .pi / 180
    let x = cos(radians)
    let y = sin(radians)
    let startX = 0.5 - x / 2
    let startY = 0.5 + y / 2
    let endX = 0.5 + x / 2
    let endY = 0.5 - y / 2
    return (UnitPoint(x: startX, y: startY), UnitPoint(x: endX, y: endY))
  }

  private static func parseDegrees(_ s: String) -> CGFloat? {
    let trimmed = s.trimmingCharacters(in: .whitespaces)
    if trimmed.hasSuffix("deg") {
      return Double(trimmed.dropLast(3)).map { CGFloat($0) }
    }
    return nil
  }

  private static func parseStops(_ args: [String]) -> [Gradient.Stop] {
    struct RawStop {
      let color: Color
      let location: CGFloat?
    }

    var raws: [RawStop] = []
    for arg in args {
      let trimmed = arg.trimmingCharacters(in: .whitespaces)
      // Try to find trailing percentage
      var colorStr = trimmed
      var location: CGFloat? = nil

      // Check for "color percentage" pattern
      if let spaceRange = trimmed.range(of: " ", options: .backwards) {
        let suffix = String(trimmed[spaceRange.upperBound...])
        if suffix.hasSuffix("%"), let pct = Double(suffix.dropLast()) {
          location = CGFloat(pct / 100.0)
          colorStr = String(trimmed[..<spaceRange.lowerBound])
        }
      }

      if let color = JSColorParser.parse(colorStr) {
        raws.append(RawStop(color: color, location: location))
      }
    }

    guard !raws.isEmpty else { return [] }

    // Auto-distribute stops that lack explicit positions
    var stops: [Gradient.Stop] = []
    let count = raws.count
    for (i, raw) in raws.enumerated() {
      let loc = raw.location ?? CGFloat(i) / CGFloat(max(count - 1, 1))
      stops.append(Gradient.Stop(color: raw.color, location: loc))
    }
    return stops
  }

  private static func looksLikeColor(_ s: String) -> Bool {
    let lower = s.lowercased()
    if lower.hasPrefix("#") { return true }
    if lower.hasPrefix("rgb") { return true }
    if lower.hasPrefix("hsl") { return true }
    // Named colors: not a direction/size keyword
    let nonColorKeywords = ["circle", "ellipse", "closest", "farthest", "contain", "cover", "at "]
    for kw in nonColorKeywords {
      if lower.hasPrefix(kw) { return false }
    }
    return true
  }
}
