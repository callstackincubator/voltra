import Foundation
import SwiftUI

/// Represents anything that can be rendered (like ReactNode)
public indirect enum VoltraNode: Hashable, View {
  /// A component element
  case element(VoltraElement)

  /// Multiple nodes (fragment/array)
  case array([VoltraNode])

  /// Plain text content
  case text(String)

  /// Nothing to render
  case empty

  // MARK: - Initialization

  /// Initialize from JSONValue (handles all types)
  /// - Parameters:
  ///   - json: The JSON value to parse
  ///   - stylesheet: Optional shared stylesheet for style deduplication
  ///   - sharedElements: Optional shared elements array for element deduplication
  public init(from json: JSONValue, stylesheet: [[String: JSONValue]]? = nil, sharedElements: [JSONValue]? = nil) {
    switch json {
    case let .string(text):
      self = .text(text)
    case let .int(num):
      self = .text(String(num))
    case let .double(num):
      self = .text(String(num))
    case let .bool(val):
      self = .text(String(val))
    case .null:
      self = .empty
    case let .array(items):
      let nodes = items.map { VoltraNode(from: $0, stylesheet: stylesheet, sharedElements: sharedElements) }.filter { !$0.isEmpty }
      self = nodes.isEmpty ? .empty : .array(nodes)
    case let .object(dict):
      // Check for element reference ($r key) and resolve from shared elements
      if let refIndex = dict["$r"]?.intValue,
         let sharedElements = sharedElements,
         refIndex >= 0, refIndex < sharedElements.count
      {
        // Resolve reference by parsing the shared element
        self = VoltraNode(from: sharedElements[refIndex], stylesheet: stylesheet, sharedElements: sharedElements)
      } else if let element = VoltraElement(from: json, stylesheet: stylesheet, sharedElements: sharedElements) {
        self = .element(element)
      } else {
        self = .empty
      }
    }
  }

  /// Check if node represents nothing
  public var isEmpty: Bool {
    if case .empty = self { return true }
    return false
  }

  /// Parse a VoltraNode from JSON, extracting stylesheet and sharedElements if present
  /// This is a convenience factory that handles the common pattern of extracting
  /// stylesheet ("s") and sharedElements ("e") from the root JSON object.
  /// - Parameter json: The JSON value to parse
  /// - Returns: A parsed VoltraNode
  public static func parse(from json: JSONValue) -> VoltraNode {
    var stylesheet: [[String: JSONValue]]? = nil
    var sharedElements: [JSONValue]? = nil

    if case let .object(rootObject) = json {
      // Extract stylesheet (key "s")
      if case let .array(stylesheetArray) = rootObject["s"] {
        stylesheet = stylesheetArray.compactMap { item in
          if case let .object(dict) = item { return dict }
          return nil
        }
      }
      // Extract shared elements (key "e")
      if case let .array(elementsArray) = rootObject["e"] {
        sharedElements = elementsArray
      }
    }

    return VoltraNode(from: json, stylesheet: stylesheet, sharedElements: sharedElements)
  }

  // MARK: - View conformance

  public var body: some View {
    switch self {
    case let .element(element):
      VoltraElementView(element: element)
    case let .array(nodes):
      // Use stable identifiers: prefer element.id, fall back to index
      let items: [(id: String, node: VoltraNode)] = nodes.enumerated().map { offset, node in
        let id: String
        if case let .element(element) = node, let elementId = element.id {
          id = elementId
        } else {
          id = "idx_\(offset)"
        }
        return (id: id, node: node)
      }
      ForEach(items, id: \.id) { item in
        item.node
      }
    case let .text(text):
      Text(text)
    case .empty:
      EmptyView()
    }
  }
}

/// View that renders a VoltraElement based on its type
struct VoltraElementView: View {
  let element: VoltraElement

  @Environment(\.voltraEnvironment) private var voltraEnvironment

  private var resolvedElement: VoltraElement {
    element.withResolvableEnvironment(voltraEnvironment.resolvableEnvironment)
  }

  var body: some View {
    switch resolvedElement.type {
    case "Button":
      VoltraButton(resolvedElement)

    case "Link":
      VoltraLink(resolvedElement)

    case "VStack":
      VoltraVStack(resolvedElement)

    case "HStack":
      VoltraHStack(resolvedElement)

    case "View":
      VoltraFlexView(resolvedElement)

    case "ZStack":
      VoltraZStack(resolvedElement)

    case "Text":
      VoltraText(resolvedElement)

    case "Image":
      VoltraImage(resolvedElement)

    case "Symbol":
      VoltraSymbol(resolvedElement)

    case "Divider":
      VoltraDivider(resolvedElement)

    case "Spacer":
      VoltraSpacer(resolvedElement)

    case "Label":
      VoltraLabel(resolvedElement)

    case "Toggle":
      VoltraToggle(resolvedElement)

    case "Gauge":
      VoltraGauge(resolvedElement)

    case "LinearProgressView":
      VoltraLinearProgressView(resolvedElement)

    case "CircularProgressView":
      VoltraCircularProgressView(resolvedElement)

    case "Timer":
      VoltraTimer(resolvedElement)

    case "GroupBox":
      VoltraGroupBox(resolvedElement)

    case "LinearGradient":
      VoltraLinearGradient(resolvedElement)

    case "GlassContainer":
      VoltraGlassContainer(resolvedElement)

    case "Mask":
      VoltraMask(resolvedElement)

    case "Chart":
      if #available(iOS 16.0, macOS 13.0, *) {
        VoltraChart(resolvedElement)
      } else {
        EmptyView()
      }

    case "ControlIf":
      VoltraControlIf(resolvedElement)

    case "ControlSwitch":
      VoltraControlSwitch(resolvedElement)

    default:
      EmptyView()
    }
  }
}
