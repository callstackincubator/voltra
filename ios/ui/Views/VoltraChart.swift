import Charts
import SwiftUI

@available(iOS 16.0, macOS 13.0, *)
public struct VoltraChart: VoltraView {
  public typealias Parameters = ChartParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  // MARK: - Wire format

  private struct WireMark {
    let type: String
    let data: [[JSONValue]]?
    let props: [String: JSONValue]
  }

  private func parseMarks(from json: String) -> [WireMark] {
    guard
      let data = json.data(using: .utf8),
      let outer = try? JSONSerialization.jsonObject(with: data) as? [[Any]]
    else { return [] }

    return outer.compactMap { row -> WireMark? in
      guard row.count >= 3,
            let type = row[0] as? String,
            let rawProps = row[2] as? [String: Any]
      else { return nil }

      let pts: [[JSONValue]]? = (row[1] as? [[Any]])?.map { $0.compactMap { jsonValue(from: $0) } }
      let props = rawProps.compactMapValues { jsonValue(from: $0) }
      return WireMark(type: type, data: pts, props: props)
    }
  }

  // MARK: - Helpers

  /// Extract a Double from a JSONValue that may be .int or .double
  private func num(_ v: JSONValue) -> Double? {
    switch v {
    case let .double(d): return d
    case let .int(i): return Double(i)
    default: return nil
    }
  }

  private func wireColor(_ props: [String: JSONValue]) -> Color? {
    guard case let .string(s)? = props["c"] else { return nil }
    return JSColorParser.parse(s)
  }

  private func symbolShape(_ props: [String: JSONValue]) -> BasicChartSymbolShape? {
    guard case let .string(s)? = props["sym"] else { return nil }
    switch s {
    case "circle": return .circle
    case "square": return .square
    case "triangle": return .triangle
    case "diamond": return .diamond
    case "pentagon": return .pentagon
    case "cross": return .cross
    case "plus": return .plus
    case "asterisk": return .asterisk
    default: return nil
    }
  }

  private func interpolation(_ props: [String: JSONValue]) -> InterpolationMethod {
    guard case let .string(s)? = props["itp"] else { return .linear }
    switch s {
    case "monotone": return .monotone
    case "stepStart": return .stepStart
    case "stepEnd": return .stepEnd
    case "stepCenter": return .stepCenter
    case "cardinal": return .cardinal
    case "catmullRom": return .catmullRom
    default: return .linear
    }
  }

  private func visibility(_ raw: String?) -> Visibility {
    switch raw {
    case "visible": return .visible
    case "hidden": return .hidden
    default: return .automatic
    }
  }

  /// Unpack [x, y] or [x, y, series] tuples into typed values.
  private func xy(_ pt: [JSONValue]) -> (xStr: String?, xNum: Double?, y: Double, series: String?) {
    guard pt.count >= 2 else { return (nil, nil, 0, nil) }
    let y: Double = {
      switch pt[1] {
      case let .double(v): return v
      case let .int(v): return Double(v)
      default: return 0
      }
    }()
    let series: String? = pt.count >= 3 ? { if case let .string(s) = pt[2] { return s }; return nil }() : nil
    switch pt[0] {
    case let .string(x): return (x, nil, y, series)
    case let .double(x): return (nil, x, y, series)
    case let .int(x): return (nil, Double(x), y, series)
    default: return (nil, nil, y, series)
    }
  }

  // MARK: - body

  public var body: some View {
    let wireMarks = params.marks.flatMap { parseMarks(from: $0) } ?? []

    Chart {
      buildAll(wireMarks)
    }
    .chartXAxis(visibility(params.xAxisVisibility))
    .chartYAxis(visibility(params.yAxisVisibility))
    .chartLegend(visibility(params.legendVisibility))
    .applyForegroundStyleScale(params.foregroundStyleScale)
    .applyScrollableAxes(params.chartScrollableAxes)
    .applyStyle(element.style)
  }

  // MARK: - ChartContent

  @ChartContentBuilder
  private func buildAll(_ marks: [WireMark]) -> some ChartContent {
    ForEach(Array(marks.enumerated()), id: \.offset) { _, m in
      buildMark(m)
    }
  }

  @ChartContentBuilder
  private func buildMark(_ m: WireMark) -> some ChartContent {
    if m.type == "bar" { barContent(m) }
    if m.type == "line" { lineContent(m) }
    if m.type == "area" { areaContent(m) }
    if m.type == "point" { pointContent(m) }
    if m.type == "rule" { ruleContent(m) }
    if #available(iOS 17.0, macOS 14.0, *), m.type == "sector" { sectorContent(m) }
  }

  // MARK: Bar

  @ChartContentBuilder
  private func barContent(_ m: WireMark) -> some ChartContent {
    ForEach(Array((m.data ?? []).enumerated()), id: \.offset) { _, pt in
      barPoint(pt, props: m.props)
    }
  }

  @ChartContentBuilder
  private func barPoint(_ pt: [JSONValue], props: [String: JSONValue]) -> some ChartContent {
    let (xStr, xNum, y, series) = xy(pt)
    let cr: CGFloat? = props["cr"].flatMap(num).map { CGFloat($0) }
    let barWidth: MarkDimension = {
      if let v = props["w"].flatMap(num) { return .fixed(CGFloat(v)) }
      return .automatic
    }()
    let grouped: Bool = { if case let .string(s)? = props["stk"] { return s == "grouped" }; return false }()

    if let x = xStr {
      if let series {
        if let cr {
          if grouped {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
              .foregroundStyle(by: .value("series", series))
              .position(by: .value("series", series))
          } else {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
              .foregroundStyle(by: .value("series", series))
          }
        } else {
          if grouped {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
              .foregroundStyle(by: .value("series", series))
              .position(by: .value("series", series))
          } else {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
              .foregroundStyle(by: .value("series", series))
          }
        }
      } else if let c = wireColor(props) {
        if let cr {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr).foregroundStyle(c)
        } else {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).foregroundStyle(c)
        }
      } else {
        if let cr {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
        } else {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
        }
      }
    } else if let x = xNum {
      if let series {
        if let cr {
          if grouped {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
              .foregroundStyle(by: .value("series", series))
              .position(by: .value("series", series))
          } else {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
              .foregroundStyle(by: .value("series", series))
          }
        } else {
          if grouped {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
              .foregroundStyle(by: .value("series", series))
              .position(by: .value("series", series))
          } else {
            Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
              .foregroundStyle(by: .value("series", series))
          }
        }
      } else if let c = wireColor(props) {
        if let cr {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr).foregroundStyle(c)
        } else {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).foregroundStyle(c)
        }
      } else {
        if let cr {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth).cornerRadius(cr)
        } else {
          Charts.BarMark(x: .value("x", x), y: .value("y", y), width: barWidth)
        }
      }
    }
  }

  // MARK: Line

  @ChartContentBuilder
  private func lineContent(_ m: WireMark) -> some ChartContent {
    ForEach(Array((m.data ?? []).enumerated()), id: \.offset) { _, pt in
      linePoint(pt, props: m.props)
    }
  }

  @ChartContentBuilder
  private func linePoint(_ pt: [JSONValue], props: [String: JSONValue]) -> some ChartContent {
    let (xStr, xNum, y, series) = xy(pt)
    let itp = interpolation(props)
    let lw: CGFloat? = props["lw"].flatMap(num).map { CGFloat($0) }
    let stroke: StrokeStyle? = lw.map { StrokeStyle(lineWidth: $0) }
    let sym = symbolShape(props)

    if let x = xStr {
      if let series {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym).foregroundStyle(by: .value("series", series))
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).foregroundStyle(by: .value("series", series))
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym).foregroundStyle(by: .value("series", series))
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).foregroundStyle(by: .value("series", series))
        }
      } else if let c = wireColor(props) {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym).foregroundStyle(c)
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).foregroundStyle(c)
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym).foregroundStyle(c)
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).foregroundStyle(c)
        }
      } else {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym)
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke)
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym)
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp)
        }
      }
    } else if let x = xNum {
      if let series {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym).foregroundStyle(by: .value("series", series))
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).foregroundStyle(by: .value("series", series))
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym).foregroundStyle(by: .value("series", series))
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).foregroundStyle(by: .value("series", series))
        }
      } else if let c = wireColor(props) {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym).foregroundStyle(c)
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).foregroundStyle(c)
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym).foregroundStyle(c)
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).foregroundStyle(c)
        }
      } else {
        if let stroke, let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke).symbol(sym)
        } else if let stroke {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).lineStyle(stroke)
        } else if let sym {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp).symbol(sym)
        } else {
          Charts.LineMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp)
        }
      }
    }
  }

  // MARK: Area

  @ChartContentBuilder
  private func areaContent(_ m: WireMark) -> some ChartContent {
    ForEach(Array((m.data ?? []).enumerated()), id: \.offset) { _, pt in
      areaPoint(pt, props: m.props)
    }
  }

  @ChartContentBuilder
  private func areaPoint(_ pt: [JSONValue], props: [String: JSONValue]) -> some ChartContent {
    let (xStr, xNum, y, series) = xy(pt)
    let itp = interpolation(props)

    if let x = xStr {
      if let series {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y))
          .interpolationMethod(itp).foregroundStyle(by: .value("series", series))
      } else if let c = wireColor(props) {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y))
          .interpolationMethod(itp).foregroundStyle(c)
      } else {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp)
      }
    } else if let x = xNum {
      if let series {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y))
          .interpolationMethod(itp).foregroundStyle(by: .value("series", series))
      } else if let c = wireColor(props) {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y))
          .interpolationMethod(itp).foregroundStyle(c)
      } else {
        Charts.AreaMark(x: .value("x", x), y: .value("y", y)).interpolationMethod(itp)
      }
    }
  }

  // MARK: Point

  @ChartContentBuilder
  private func pointContent(_ m: WireMark) -> some ChartContent {
    ForEach(Array((m.data ?? []).enumerated()), id: \.offset) { _, pt in
      pointPoint(pt, props: m.props)
    }
  }

  @ChartContentBuilder
  private func pointPoint(_ pt: [JSONValue], props: [String: JSONValue]) -> some ChartContent {
    let (xStr, xNum, y, series) = xy(pt)
    let sym = symbolShape(props)
    let symSize: CGFloat? = props["syms"].flatMap(num).map { CGFloat($0) }

    if let x = xStr {
      if let series {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize).foregroundStyle(by: .value("series", series))
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).foregroundStyle(by: .value("series", series))
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize).foregroundStyle(by: .value("series", series))
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).foregroundStyle(by: .value("series", series))
        }
      } else if let c = wireColor(props) {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize).foregroundStyle(c)
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).foregroundStyle(c)
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize).foregroundStyle(c)
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).foregroundStyle(c)
        }
      } else {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize)
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym)
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize)
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y))
        }
      }
    } else if let x = xNum {
      if let series {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize).foregroundStyle(by: .value("series", series))
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).foregroundStyle(by: .value("series", series))
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize).foregroundStyle(by: .value("series", series))
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).foregroundStyle(by: .value("series", series))
        }
      } else if let c = wireColor(props) {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize).foregroundStyle(c)
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).foregroundStyle(c)
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize).foregroundStyle(c)
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).foregroundStyle(c)
        }
      } else {
        if let sym, let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym).symbolSize(symSize)
        } else if let sym {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbol(sym)
        } else if let symSize {
          Charts.PointMark(x: .value("x", x), y: .value("y", y)).symbolSize(symSize)
        } else {
          Charts.PointMark(x: .value("x", x), y: .value("y", y))
        }
      }
    }
  }

  // MARK: Rule

  @ChartContentBuilder
  private func ruleContent(_ m: WireMark) -> some ChartContent {
    let props = m.props
    let lw: CGFloat? = props["lw"].flatMap(num).map { CGFloat($0) }
    let stroke: StrokeStyle? = lw.map { StrokeStyle(lineWidth: $0) }

    if let yv = props["yv"].flatMap(num) {
      if let c = wireColor(props) {
        if let stroke {
          Charts.RuleMark(y: .value("y", yv)).lineStyle(stroke).foregroundStyle(c)
        } else {
          Charts.RuleMark(y: .value("y", yv)).foregroundStyle(c)
        }
      } else if let stroke {
        Charts.RuleMark(y: .value("y", yv)).lineStyle(stroke)
      } else {
        Charts.RuleMark(y: .value("y", yv))
      }
    } else if case let .string(xv)? = props["xv"] {
      if let c = wireColor(props) {
        if let stroke {
          Charts.RuleMark(x: .value("x", xv)).lineStyle(stroke).foregroundStyle(c)
        } else {
          Charts.RuleMark(x: .value("x", xv)).foregroundStyle(c)
        }
      } else if let stroke {
        Charts.RuleMark(x: .value("x", xv)).lineStyle(stroke)
      } else {
        Charts.RuleMark(x: .value("x", xv))
      }
    } else if let xv = props["xv"].flatMap(num) {
      if let c = wireColor(props) {
        if let stroke {
          Charts.RuleMark(x: .value("x", xv)).lineStyle(stroke).foregroundStyle(c)
        } else {
          Charts.RuleMark(x: .value("x", xv)).foregroundStyle(c)
        }
      } else if let stroke {
        Charts.RuleMark(x: .value("x", xv)).lineStyle(stroke)
      } else {
        Charts.RuleMark(x: .value("x", xv))
      }
    }
  }

  // MARK: Sector (iOS 17+)

  @available(iOS 17.0, macOS 14.0, *)
  @ChartContentBuilder
  private func sectorContent(_ m: WireMark) -> some ChartContent {
    ForEach(Array((m.data ?? []).enumerated()), id: \.offset) { _, pt in
      sectorPoint(pt, props: m.props)
    }
  }

  @available(iOS 17.0, macOS 14.0, *)
  @ChartContentBuilder
  private func sectorPoint(_ pt: [JSONValue], props: [String: JSONValue]) -> some ChartContent {
    if pt.count >= 2,
       let value = num(pt[0]),
       case let .string(category) = pt[1]
    {
      let inner: MarkDimension = {
        if let v = props["ir"].flatMap(num) { return .ratio(CGFloat(v)) }
        return .automatic
      }()
      let outer: MarkDimension = {
        if let v = props["or"].flatMap(num) { return .ratio(CGFloat(v)) }
        return .automatic
      }()
      let inset: CGFloat = {
        if let v = props["agin"].flatMap(num) { return CGFloat(v) }
        return 0
      }()

      if let c = wireColor(props) {
        Charts.SectorMark(
          angle: .value(category, value),
          innerRadius: inner, outerRadius: outer, angularInset: inset
        )
        .foregroundStyle(by: .value("category", category))
        .foregroundStyle(c)
      } else {
        Charts.SectorMark(
          angle: .value(category, value),
          innerRadius: inner, outerRadius: outer, angularInset: inset
        )
        .foregroundStyle(by: .value("category", category))
      }
    }
  }
}

// MARK: - Any → JSONValue bridge

//
// JSONSerialization.data(withJSONObject:) throws an ObjC NSException (not a Swift error)
// when the input is a top-level primitive (NSNumber, NSString, etc.), which try? cannot
// catch. We avoid it entirely by directly pattern-matching the already-parsed Any values.

private func jsonValue(from value: Any) -> JSONValue? {
  switch value {
  case is NSNull:
    return .null
  case let n as NSNumber:
    // Distinguish Bool from numeric types (NSNumber encodes both)
    if CFGetTypeID(n) == CFBooleanGetTypeID() {
      return .bool(n.boolValue)
    }
    // Use integer when the value has no fractional part
    let d = n.doubleValue
    if d == d.rounded(), !d.isInfinite, let i = Int(exactly: d) {
      return .int(i)
    }
    return .double(d)
  case let s as String:
    return .string(s)
  case let arr as [Any]:
    return .array(arr.compactMap { jsonValue(from: $0) })
  case let dict as [String: Any]:
    return .object(dict.compactMapValues { jsonValue(from: $0) })
  default:
    return nil
  }
}

// MARK: - View helpers for chart-level modifiers

@available(iOS 16.0, macOS 13.0, *)
private extension View {
  @ViewBuilder
  func applyForegroundStyleScale(_ raw: String?) -> some View {
    if let raw,
       let data = raw.data(using: .utf8),
       let pairs = try? JSONSerialization.jsonObject(with: data) as? [[String]],
       !pairs.isEmpty
    {
      let domain = pairs.compactMap(\.first)
      let range: [Color] = pairs.compactMap { p -> Color? in
        guard p.count >= 2 else { return nil }
        return JSColorParser.parse(p[1])
      }
      if domain.count == range.count {
        chartForegroundStyleScale(domain: domain, range: range)
      } else {
        self
      }
    } else {
      self
    }
  }

  @ViewBuilder
  func applyScrollableAxes(_ raw: String?) -> some View {
    if #available(iOS 17.0, macOS 14.0, *) {
      switch raw {
      case "horizontal": chartScrollableAxes(.horizontal)
      case "vertical": chartScrollableAxes(.vertical)
      default: self
      }
    } else {
      self
    }
  }
}
