import SwiftUI

public struct VoltraControlSwitch: VoltraView {
  public typealias Parameters = EmptyParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    resolvedNode
  }

  private var resolvedNode: VoltraNode {
    guard let casesJSON = element.rawPropJSON("cases"),
          case let .object(casesDict) = casesJSON
    else {
      return .empty
    }

    let key: String
    if let valueJSON = element.props?["value"] {
      key = matchKey(for: valueJSON)
    } else {
      key = ResolvableWireKey.defaultCase
    }

    let caseJSON = casesDict[key] ?? casesDict[ResolvableWireKey.defaultCase]
    guard let caseJSON else { return .empty }

    return VoltraNode(from: caseJSON, stylesheet: element.stylesheet, sharedElements: element.sharedElements)
  }

  private func matchKey(for value: JSONValue) -> String {
    switch value {
    case .null:
      return "null"
    case let .bool(b):
      return b ? "true" : "false"
    case let .int(i):
      return String(i)
    case let .double(d):
      if d.isFinite, d.rounded(.towardZero) == d { return String(Int(d)) }
      return String(d)
    case let .string(s):
      return s
    default:
      return ResolvableWireKey.defaultCase
    }
  }
}
