import Foundation
import SwiftUI

enum JSGradientParser {
  private enum CacheEntry {
    case success(BackgroundValue)
    case failure
  }

  private enum GradientKind {
    case linear
    case radial
    case conic
  }

  private struct ColorStopToken {
    var color: Color
    var firstPosition: Double?
    var secondPosition: Double?
  }

  private struct LinearSpec {
    var startPoint: UnitPoint
    var endPoint: UnitPoint
    var stops: [Gradient.Stop]
  }

  private struct RadialSpec {
    var center: UnitPoint
    var shape: RadialGradientShape
    var extent: RadialGradientExtent
    var stops: [Gradient.Stop]
  }

  private struct ConicSpec {
    var center: UnitPoint
    var angle: Angle
    var stops: [Gradient.Stop]
  }

  private static let cacheLimit = 256
  private static var cache: [String: CacheEntry] = [:]
  private static var cacheOrder: [String] = []
  private static let cacheLock = NSLock()

  static func parse(_ input: String) -> BackgroundValue? {
    let raw = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !raw.isEmpty else { return nil }
    let key = raw.lowercased()

    if let cached = cacheValue(for: key) {
      switch cached {
      case let .success(value):
        return value
      case .failure:
        return nil
      }
    }

    let result = parseUncached(raw)
    setCacheValue(result.map(CacheEntry.success) ?? .failure, for: key)
    return result
  }

  private static func parseUncached(_ raw: String) -> BackgroundValue? {
    let lower = raw.lowercased()
    if lower.hasPrefix("repeating-linear-gradient(") || lower.hasPrefix("repeating-radial-gradient(") || lower.hasPrefix("repeating-conic-gradient(") {
      return nil
    }
    if lower.hasPrefix("linear-gradient(") {
      return parseLinear(raw)
    }
    if lower.hasPrefix("radial-gradient(") {
      return parseRadial(raw)
    }
    if lower.hasPrefix("conic-gradient(") {
      return parseConic(raw)
    }
    return nil
  }

  // MARK: - Top level parsers

  private static func parseLinear(_ value: String) -> BackgroundValue? {
    guard let content = extractContent(value, prefix: "linear-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard args.count >= 2 else { return nil }

    var startPoint = UnitPoint(x: 0.5, y: 0)
    var endPoint = UnitPoint(x: 0.5, y: 1)
    var stopArgs = args

    if let first = args.first {
      let trimmed = first.trimmingCharacters(in: .whitespacesAndNewlines)
      if trimmed.lowercased().hasPrefix("to ") {
        guard let points = parseLinearDirection(trimmed) else { return nil }
        startPoint = points.start
        endPoint = points.end
        stopArgs = Array(args.dropFirst())
      } else if let angle = parseAngle(trimmed) {
        let points = angleToPoints(angle)
        startPoint = points.start
        endPoint = points.end
        stopArgs = Array(args.dropFirst())
      }
    }

    guard let stops = parseStops(stopArgs, kind: .linear), stops.count >= 2 else { return nil }
    let spec = LinearSpec(startPoint: startPoint, endPoint: endPoint, stops: stops)
    return .linearGradient(gradient: Gradient(stops: spec.stops), startPoint: spec.startPoint, endPoint: spec.endPoint)
  }

  private static func parseRadial(_ value: String) -> BackgroundValue? {
    guard let content = extractContent(value, prefix: "radial-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard args.count >= 2 else { return nil }

    var shape: RadialGradientShape = .ellipse
    var extent: RadialGradientExtent = .farthestCorner
    var center = UnitPoint.center
    var stopArgs = args

    if let first = args.first, parseColorStop(first, kind: .radial) == nil {
      guard let radialPrelude = parseRadialPrelude(first) else { return nil }
      shape = radialPrelude.shape
      extent = radialPrelude.extent
      center = radialPrelude.center
      stopArgs = Array(args.dropFirst())
    }

    guard let stops = parseStops(stopArgs, kind: .radial), stops.count >= 2 else { return nil }
    let spec = RadialSpec(center: center, shape: shape, extent: extent, stops: stops)
    return .radialGradient(spec: RadialGradientSpec(
      gradient: Gradient(stops: spec.stops),
      center: spec.center,
      shape: spec.shape,
      extent: spec.extent
    ))
  }

  private static func parseConic(_ value: String) -> BackgroundValue? {
    guard let content = extractContent(value, prefix: "conic-gradient(") else { return nil }
    let args = splitGradientArgs(content)
    guard args.count >= 2 else { return nil }

    var center = UnitPoint.center
    var angle = Angle.zero
    var stopArgs = args

    if let first = args.first, parseColorStop(first, kind: .conic) == nil {
      guard let prelude = parseConicPrelude(first) else { return nil }
      center = prelude.center
      angle = prelude.angle
      stopArgs = Array(args.dropFirst())
    }

    guard let stops = parseStops(stopArgs, kind: .conic), stops.count >= 2 else { return nil }
    let spec = ConicSpec(center: center, angle: angle, stops: stops)
    return .angularGradient(gradient: Gradient(stops: spec.stops), center: spec.center, angle: spec.angle)
  }

  // MARK: - Cache

  private static func cacheValue(for key: String) -> CacheEntry? {
    cacheLock.lock()
    defer { cacheLock.unlock() }
    return cache[key]
  }

  private static func setCacheValue(_ value: CacheEntry, for key: String) {
    cacheLock.lock()
    defer { cacheLock.unlock() }

    if cache[key] == nil {
      cacheOrder.append(key)
      if cacheOrder.count > cacheLimit {
        let oldest = cacheOrder.removeFirst()
        cache.removeValue(forKey: oldest)
      }
    }
    cache[key] = value
  }

  // MARK: - Grammar helpers

  static func extractContent(_ value: String, prefix: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    let lower = trimmed.lowercased()
    guard lower.hasPrefix(prefix), trimmed.hasSuffix(")") else { return nil }
    return String(trimmed.dropFirst(prefix.count).dropLast())
  }

  static func splitGradientArgs(_ content: String) -> [String] {
    var args: [String] = []
    var current = ""
    var depth = 0

    for char in content {
      if char == "(" {
        depth += 1
      } else if char == ")" {
        depth -= 1
        if depth < 0 { return [] }
      }

      if char == ",", depth == 0 {
        let token = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if token.isEmpty { return [] }
        args.append(token)
        current = ""
      } else {
        current.append(char)
      }
    }

    guard depth == 0 else { return [] }

    let token = current.trimmingCharacters(in: .whitespacesAndNewlines)
    if token.isEmpty { return [] }
    args.append(token)
    return args
  }

  private static func splitByWhitespaceOutsideParentheses(_ value: String) -> [String] {
    var result: [String] = []
    var current = ""
    var depth = 0

    for char in value {
      if char == "(" {
        depth += 1
      } else if char == ")" {
        depth -= 1
        if depth < 0 { return [] }
      }

      if char.isWhitespace, depth == 0 {
        let token = current.trimmingCharacters(in: .whitespacesAndNewlines)
        if !token.isEmpty {
          result.append(token)
        }
        current = ""
      } else {
        current.append(char)
      }
    }

    guard depth == 0 else { return [] }

    let tail = current.trimmingCharacters(in: .whitespacesAndNewlines)
    if !tail.isEmpty {
      result.append(tail)
    }
    return result
  }

  // MARK: - Linear helpers

  private static func parseLinearDirection(_ value: String) -> (start: UnitPoint, end: UnitPoint)? {
    let lower = value.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
    guard lower.hasPrefix("to ") else { return nil }
    let suffix = lower.dropFirst(3)
    let words = suffix.split(separator: " ").map(String.init)
    guard (1 ... 2).contains(words.count) else { return nil }

    var horizontal: String?
    var vertical: String?

    for word in words {
      switch word {
      case "left", "right":
        if horizontal != nil { return nil }
        horizontal = word
      case "top", "bottom":
        if vertical != nil { return nil }
        vertical = word
      default:
        return nil
      }
    }

    let endX: Double = switch horizontal {
    case "left": 0
    case "right": 1
    default: 0.5
    }
    let endY: Double = switch vertical {
    case "top": 0
    case "bottom": 1
    default: 0.5
    }
    let start = UnitPoint(x: 1 - endX, y: 1 - endY)
    let end = UnitPoint(x: endX, y: endY)
    return (start, end)
  }

  private static func angleToPoints(_ angle: Angle) -> (start: UnitPoint, end: UnitPoint) {
    let radians = (angle.degrees - 90) * .pi / 180
    let x = cos(radians)
    let y = sin(radians)

    let startX = 0.5 - x / 2
    let startY = 0.5 + y / 2
    let endX = 0.5 + x / 2
    let endY = 0.5 - y / 2
    return (UnitPoint(x: startX, y: startY), UnitPoint(x: endX, y: endY))
  }

  // MARK: - Radial helpers

  private static func parseRadialPrelude(_ value: String) -> (shape: RadialGradientShape, extent: RadialGradientExtent, center: UnitPoint)? {
    let tokens = splitByWhitespaceOutsideParentheses(value.lowercased())
    guard !tokens.isEmpty else { return nil }

    var shape: RadialGradientShape = .ellipse
    var extent: RadialGradientExtent = .farthestCorner
    var center = UnitPoint.center
    var idx = 0

    while idx < tokens.count {
      let token = tokens[idx]
      if token == "at" {
        let positionTokens = Array(tokens[(idx + 1)...])
        guard let parsedCenter = parsePosition(positionTokens), !positionTokens.isEmpty else { return nil }
        center = parsedCenter
        idx = tokens.count
      } else if token == "circle" {
        shape = .circle
        idx += 1
      } else if token == "ellipse" {
        shape = .ellipse
        idx += 1
      } else if let parsedExtent = parseRadialExtent(token) {
        extent = parsedExtent
        idx += 1
      } else {
        return nil
      }
    }

    return (shape, extent, center)
  }

  private static func parseRadialExtent(_ token: String) -> RadialGradientExtent? {
    switch token {
    case "closest-side":
      return .closestSide
    case "farthest-side":
      return .farthestSide
    case "closest-corner":
      return .closestCorner
    case "farthest-corner":
      return .farthestCorner
    default:
      return nil
    }
  }

  // MARK: - Conic helpers

  private static func parseConicPrelude(_ value: String) -> (angle: Angle, center: UnitPoint)? {
    let tokens = splitByWhitespaceOutsideParentheses(value.lowercased())
    guard !tokens.isEmpty else { return nil }

    var angle = Angle.zero
    var center = UnitPoint.center
    var hasFrom = false
    var hasAt = false
    var idx = 0

    while idx < tokens.count {
      let token = tokens[idx]
      if token == "from" {
        guard !hasFrom, idx + 1 < tokens.count, let parsedAngle = parseAngle(tokens[idx + 1]) else { return nil }
        angle = parsedAngle
        hasFrom = true
        idx += 2
      } else if token == "at" {
        guard !hasAt else { return nil }
        let positionTokens = Array(tokens[(idx + 1)...])
        guard let parsedCenter = parsePosition(positionTokens), !positionTokens.isEmpty else { return nil }
        center = parsedCenter
        hasAt = true
        idx = tokens.count
      } else {
        return nil
      }
    }

    return (angle, center)
  }

  // MARK: - Position helpers

  private static func parsePosition(_ tokens: [String]) -> UnitPoint? {
    guard !tokens.isEmpty, tokens.count <= 2 else { return nil }

    if tokens.count == 1 {
      switch tokens[0] {
      case "center":
        return .center
      case "left":
        return UnitPoint(x: 0, y: 0.5)
      case "right":
        return UnitPoint(x: 1, y: 0.5)
      case "top":
        return UnitPoint(x: 0.5, y: 0)
      case "bottom":
        return UnitPoint(x: 0.5, y: 1)
      default:
        return nil
      }
    }

    var x: Double?
    var y: Double?

    for token in tokens {
      switch token {
      case "left":
        if x != nil { return nil }
        x = 0
      case "right":
        if x != nil { return nil }
        x = 1
      case "center":
        if x == nil {
          x = 0.5
        } else if y == nil {
          y = 0.5
        } else {
          return nil
        }
      case "top":
        if y != nil { return nil }
        y = 0
      case "bottom":
        if y != nil { return nil }
        y = 1
      default:
        return nil
      }
    }

    return UnitPoint(x: x ?? 0.5, y: y ?? 0.5)
  }

  // MARK: - Stop helpers

  private static func parseStops(_ args: [String], kind: GradientKind) -> [Gradient.Stop]? {
    var tokens: [ColorStopToken] = []

    for raw in args {
      guard let parsed = parseColorStop(raw, kind: kind) else { return nil }
      tokens.append(parsed)
    }

    guard tokens.count >= 2 else { return nil }

    let expanded = expandColorStops(tokens)
    let resolved = resolveStopPositions(expanded)
    guard resolved.count >= 2 else { return nil }

    return resolved.map { stop in
      Gradient.Stop(color: stop.color, location: CGFloat(stop.position))
    }
  }

  private static func parseColorStop(_ token: String, kind: GradientKind) -> ColorStopToken? {
    let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }

    // Function color with optional trailing stop positions, e.g. "rgba(...) 0%".
    if let functionSplit = splitFunctionColorAndPositions(trimmed),
       let color = JSColorParser.parse(functionSplit.colorToken)
    {
      var parsedPositions: [Double] = []
      for positionToken in functionSplit.positionTokens {
        guard let position = parseStopPosition(positionToken, kind: kind) else { return nil }
        parsedPositions.append(position)
      }
      return ColorStopToken(
        color: color,
        firstPosition: parsedPositions.first,
        secondPosition: parsedPositions.count == 2 ? parsedPositions[1] : nil
      )
    }

    // Generic "color + optional trailing positions" split from right side.
    if let split = splitColorAndPositions(trimmed, kind: kind),
       let color = JSColorParser.parse(split.colorToken)
    {
      var parsed: [Double] = []
      for positionToken in split.positionTokens {
        guard let position = parseStopPosition(positionToken, kind: kind) else { return nil }
        parsed.append(position)
      }

      return ColorStopToken(
        color: color,
        firstPosition: parsed.first,
        secondPosition: parsed.count == 2 ? parsed[1] : nil
      )
    }

    if let color = JSColorParser.parse(trimmed) {
      return ColorStopToken(color: color, firstPosition: nil, secondPosition: nil)
    }

    return nil
  }

  private static func splitFunctionColorAndPositions(_ token: String) -> (colorToken: String, positionTokens: [String])? {
    let lower = token.lowercased()
    let fnPrefixes = ["rgba(", "rgb(", "hsla(", "hsl("]
    guard fnPrefixes.contains(where: { lower.hasPrefix($0) }) else { return nil }

    var depth = 0
    var closeIndex: String.Index?
    for idx in token.indices {
      let ch = token[idx]
      if ch == "(" {
        depth += 1
      } else if ch == ")" {
        depth -= 1
        if depth == 0 {
          closeIndex = idx
          break
        }
        if depth < 0 {
          return nil
        }
      }
    }
    guard let closeIndex else { return nil }

    let colorToken = String(token[...closeIndex]).trimmingCharacters(in: .whitespacesAndNewlines)
    let restStart = token.index(after: closeIndex)
    let rest = token[restStart...].trimmingCharacters(in: .whitespacesAndNewlines)
    if rest.isEmpty {
      return (colorToken, [])
    }
    let positionTokens = splitByWhitespaceOutsideParentheses(String(rest))
    guard !positionTokens.isEmpty, positionTokens.count <= 2 else { return nil }
    return (colorToken, positionTokens)
  }

  private static func splitColorAndPositions(_ token: String, kind: GradientKind) -> (colorToken: String, positionTokens: [String])? {
    let parts = splitByWhitespaceOutsideParentheses(token)
    guard parts.count >= 2 else { return nil }

    // Try two trailing position tokens first (to support "red 10% 30%").
    if parts.count >= 3,
       let colorToken = join(parts[0 ..< parts.count - 2])
    {
      let two = [parts[parts.count - 2], parts[parts.count - 1]]
      if two.allSatisfy({ parseStopPosition($0, kind: kind) != nil }) {
        return (colorToken, two)
      }
    }

    // Try one trailing position token.
    if let colorToken = join(parts[0 ..< parts.count - 1]) {
      let one = [parts[parts.count - 1]]
      if one.allSatisfy({ parseStopPosition($0, kind: kind) != nil }) {
        return (colorToken, one)
      }
    }

    return nil
  }

  private static func join(_ parts: ArraySlice<String>) -> String? {
    let value = parts.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
    return value.isEmpty ? nil : value
  }

  private static func parseStopPosition(_ token: String, kind: GradientKind) -> Double? {
    let lower = token.lowercased()
    if lower.hasSuffix("%"), let value = Double(lower.dropLast()) {
      return value / 100
    }

    if kind == .conic, let angle = parseAngle(lower) {
      return angle.degrees / 360
    }

    return nil
  }

  private struct ResolvedStop {
    var color: Color
    var position: Double
  }

  private struct IntermediateStop {
    var color: Color
    var position: Double?
  }

  private static func expandColorStops(_ stops: [ColorStopToken]) -> [IntermediateStop] {
    var expanded: [IntermediateStop] = []
    for stop in stops {
      expanded.append(.init(color: stop.color, position: stop.firstPosition))
      if let second = stop.secondPosition {
        expanded.append(.init(color: stop.color, position: second))
      }
    }
    return expanded
  }

  private static func resolveStopPositions(_ stops: [IntermediateStop]) -> [ResolvedStop] {
    guard !stops.isEmpty else { return [] }

    var positions = stops.map(\.position)
    if positions.first == nil { positions[0] = 0 }
    if positions.last == nil { positions[positions.count - 1] = 1 }

    var lastDefined: Double?
    for idx in positions.indices {
      if var current = positions[idx] {
        if let previous = lastDefined, current < previous {
          current = previous
          positions[idx] = current
        }
        lastDefined = current
      }
    }

    var index = 0
    while index < positions.count {
      if positions[index] != nil {
        index += 1
        continue
      }

      let start = index - 1
      var end = index
      while end < positions.count, positions[end] == nil {
        end += 1
      }
      guard start >= 0 else { return [] }
      guard end < positions.count, let startPos = positions[start], let endPos = positions[end] else { return [] }

      let gaps = end - start
      for step in 1 ..< gaps {
        let t = Double(step) / Double(gaps)
        positions[start + step] = startPos + (endPos - startPos) * t
      }
      index = end + 1
    }

    return zip(stops, positions).compactMap { stop, position in
      guard let position else { return nil }
      return ResolvedStop(color: stop.color, position: position)
    }
  }

  // MARK: - Numeric helpers

  private static func parseAngle(_ token: String) -> Angle? {
    let trimmed = token.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if trimmed.hasSuffix("deg"), let value = Double(trimmed.dropLast(3)) {
      return Angle(degrees: value)
    }
    if trimmed.hasSuffix("rad"), let value = Double(trimmed.dropLast(3)) {
      return Angle(radians: value)
    }
    if trimmed.hasSuffix("turn"), let value = Double(trimmed.dropLast(4)) {
      return Angle(degrees: value * 360)
    }
    return nil
  }
}
