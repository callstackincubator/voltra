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

  private func bool(_ v: JSONValue) -> Bool? {
    if case let .bool(value) = v { return value }
    return nil
  }

  private func parseAxisGridStyle(from raw: String?) -> AxisGridStyle? {
    guard let raw,
          let data = raw.data(using: .utf8),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
    else { return nil }

    let props = dict.compactMapValues { jsonValue(from: $0) }
    if props.isEmpty { return nil }

    let visible = props["v"].flatMap(bool) ?? props["visible"].flatMap(bool)
    let color = (props["c"] ?? props["color"]).flatMap {
      if case let .string(value) = $0 { return JSColorParser.parse(value) }
      return nil
    }
    let lineWidth = (props["lw"] ?? props["lineWidth"]).flatMap(num).map { CGFloat($0) }
    let dash = ((props["d"] ?? props["dash"]).flatMap {
      if case let .array(values) = $0 { return values.compactMap(num).map { CGFloat($0) } }
      return nil
    })

    return AxisGridStyle(visible: visible, color: color, lineWidth: lineWidth, dash: dash)
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

  private func parseLegendItems(from raw: String?) -> [ChartLegendItem] {
    guard let raw,
          let data = raw.data(using: .utf8),
          let pairs = try? JSONSerialization.jsonObject(with: data) as? [[String]],
          !pairs.isEmpty
    else { return [] }

    return pairs.compactMap { p -> ChartLegendItem? in
      guard p.count >= 2, let color = JSColorParser.parse(p[1]) else { return nil }
      return ChartLegendItem(label: p[0], swatch: color)
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
    let xAxisVis = visibility(params.xAxisVisibility)
    let yAxisVis = visibility(params.yAxisVisibility)
    let xAxisGridStyle = parseAxisGridStyle(from: params.xAxisGridStyle)
    let yAxisGridStyle = parseAxisGridStyle(from: params.yAxisGridStyle)
    let legendVis = visibility(params.legendVisibility)
    let legendItems = parseLegendItems(from: params.foregroundStyleScale)

    Chart {
      buildAll(wireMarks)
    }
    .applyForegroundStyleScale(params.foregroundStyleScale)
    .applyChartStyle(
      element.style,
      xAxisVisibility: xAxisVis,
      yAxisVisibility: yAxisVis,
      xAxisGridStyle: xAxisGridStyle,
      yAxisGridStyle: yAxisGridStyle,
      legendVisibility: legendVis,
      legendItems: legendItems
    )
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
    let c = wireColor(props)

    if let yv = props["yv"].flatMap(num) {
      if let c {
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
    }

    if case let .string(xv)? = props["xv"] {
      if let c {
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
      if let c {
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
          angle: .value("value", value),
          innerRadius: inner, outerRadius: outer, angularInset: inset
        )
        .foregroundStyle(c)
      } else {
        Charts.SectorMark(
          angle: .value("value", value),
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
private struct ChartLegendItem: Identifiable {
  let label: String
  let swatch: Color
  var id: String {
    label
  }
}

@available(iOS 16.0, macOS 13.0, *)
private struct AxisGridStyle {
  let visible: Bool?
  let color: Color?
  let lineWidth: CGFloat?
  let dash: [CGFloat]?
}

@available(iOS 16.0, macOS 13.0, *)
private extension View {
  @ViewBuilder
  func applyChartStyle(
    _ optionalStyle: [String: JSONValue]?,
    xAxisVisibility: Visibility,
    yAxisVisibility: Visibility,
    xAxisGridStyle: AxisGridStyle?,
    yAxisGridStyle: AxisGridStyle?,
    legendVisibility: Visibility,
    legendItems: [ChartLegendItem]
  ) -> some View {
    if let optionalStyle {
      let anyStyle = optionalStyle.mapValues { $0.toAny() }
      let (layout, decoration, rendering, _) = StyleConverter.convert(anyStyle)
      let styled = modifier(CompositeStyleModifier(
        layout: layout,
        decoration: decoration,
        rendering: rendering,
        contentAlignment: .topLeading
      ))
      if let color = JSColorParser.parse(anyStyle["color"]) {
        styled
          .applyChartXAxis(visibility: xAxisVisibility, labelColor: color, gridStyle: xAxisGridStyle)
          .applyChartYAxis(visibility: yAxisVisibility, labelColor: color, gridStyle: yAxisGridStyle)
          .applyChartLegend(visibility: legendVisibility, labelColor: color, items: legendItems)
          .applyChartInsets(xAxisVisibility: xAxisVisibility, yAxisVisibility: yAxisVisibility)
          .foregroundStyle(color)
          .foregroundColor(color)
          .tint(color)
      } else {
        styled
          .applyChartXAxis(visibility: xAxisVisibility, labelColor: nil, gridStyle: xAxisGridStyle)
          .applyChartYAxis(visibility: yAxisVisibility, labelColor: nil, gridStyle: yAxisGridStyle)
          .applyChartLegend(visibility: legendVisibility, labelColor: nil, items: legendItems)
          .applyChartInsets(xAxisVisibility: xAxisVisibility, yAxisVisibility: yAxisVisibility)
      }
    } else {
      applyChartXAxis(visibility: xAxisVisibility, labelColor: nil, gridStyle: xAxisGridStyle)
        .applyChartYAxis(visibility: yAxisVisibility, labelColor: nil, gridStyle: yAxisGridStyle)
        .applyChartLegend(visibility: legendVisibility, labelColor: nil, items: legendItems)
        .applyChartInsets(xAxisVisibility: xAxisVisibility, yAxisVisibility: yAxisVisibility)
    }
  }

  @ViewBuilder
  func applyChartInsets(xAxisVisibility: Visibility, yAxisVisibility: Visibility) -> some View {
    let leading: CGFloat = yAxisVisibility == .hidden ? -8 : 10
    let trailing: CGFloat = yAxisVisibility == .hidden ? -8 : 0
    let top: CGFloat = xAxisVisibility == .hidden ? -8 : (yAxisVisibility == .hidden ? 0 : 8)
    let bottom: CGFloat = xAxisVisibility == .hidden ? -8 : 0
    padding(.init(top: top, leading: leading, bottom: bottom, trailing: trailing))
  }

  @ViewBuilder
  func applyChartLegend(visibility: Visibility, labelColor: Color?, items: [ChartLegendItem]) -> some View {
    if visibility == .hidden {
      chartLegend(.hidden)
    } else {
      chartLegend(position: .automatic, alignment: .center, spacing: 8) {
        HStack(spacing: 12) {
          ForEach(items) { item in
            HStack(spacing: 6) {
              Circle()
                .fill(item.swatch)
                .frame(width: 8, height: 8)
              Text(item.label)
                .foregroundStyle(labelColor ?? .primary)
            }
          }
        }
      }
      .chartLegend(visibility)
    }
  }

  func axisGridStrokeStyle(_ gridStyle: AxisGridStyle?) -> StrokeStyle? {
    guard let gridStyle else { return nil }
    guard gridStyle.lineWidth != nil || (gridStyle.dash?.isEmpty == false) else { return nil }
    return StrokeStyle(lineWidth: gridStyle.lineWidth ?? 1, dash: gridStyle.dash ?? [])
  }

  @ViewBuilder
  func applyChartXAxis(visibility: Visibility, labelColor: Color?, gridStyle: AxisGridStyle?) -> some View {
    if visibility == .hidden {
      chartXAxis(.hidden)
    } else if gridStyle == nil, labelColor == nil {
      chartXAxis(visibility)
    } else {
      chartXAxis {
        AxisMarks {
          if gridStyle?.visible != false {
            if let stroke = axisGridStrokeStyle(gridStyle) {
              if let color = gridStyle?.color {
                AxisGridLine(stroke: stroke).foregroundStyle(color)
              } else {
                AxisGridLine(stroke: stroke)
              }
            } else if let color = gridStyle?.color {
              AxisGridLine().foregroundStyle(color)
            } else {
              AxisGridLine()
            }
          }
          AxisTick()
          if let labelColor {
            AxisValueLabel()
              .foregroundStyle(labelColor)
          } else {
            AxisValueLabel()
          }
        }
      }
    }
  }

  @ViewBuilder
  func applyChartYAxis(visibility: Visibility, labelColor: Color?, gridStyle: AxisGridStyle?) -> some View {
    if visibility == .hidden {
      chartYAxis(.hidden)
    } else if visibility != .visible, gridStyle == nil, labelColor == nil {
      chartYAxis(visibility)
    } else {
      chartYAxis {
        AxisMarks(position: .leading) {
          if gridStyle?.visible != false {
            if let stroke = axisGridStrokeStyle(gridStyle) {
              if let color = gridStyle?.color {
                AxisGridLine(stroke: stroke).foregroundStyle(color)
              } else {
                AxisGridLine(stroke: stroke)
              }
            } else if let color = gridStyle?.color {
              AxisGridLine().foregroundStyle(color)
            } else {
              AxisGridLine()
            }
          }
          AxisTick()
          if let labelColor {
            AxisValueLabel()
              .foregroundStyle(labelColor)
          } else {
            AxisValueLabel()
          }
        }
      }
    }
  }

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
}
