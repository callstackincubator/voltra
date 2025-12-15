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
    public init(from json: JSONValue) {
        switch json {
        case .string(let text):
            self = .text(text)
        case .int(let num):
            self = .text(String(num))
        case .double(let num):
            self = .text(String(num))
        case .bool(let val):
            self = .text(String(val))
        case .null:
            self = .empty
        case .array(let items):
            let nodes = items.map { VoltraNode(from: $0) }.filter { !$0.isEmpty }
            self = nodes.isEmpty ? .empty : .array(nodes)
        case .object:
            if let element = VoltraElement(from: json) {
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

    // MARK: - View conformance

    public var body: some View {
        switch self {
        case .element(let element):
            VoltraElementView(element: element)
        case .array(let nodes):
            // Use stable identifiers: prefer element.id, fall back to index
            let items: [(id: String, node: VoltraNode)] = nodes.enumerated().map { (offset, node) in
                let id: String
                if case .element(let element) = node, let elementId = element.id {
                    id = elementId
                } else {
                    id = "idx_\(offset)"
                }
                return (id: id, node: node)
            }
            ForEach(items, id: \.id) { item in
                item.node
            }
        case .text(let text):
            Text(text)
        case .empty:
            EmptyView()
        }
    }
}

/// View that renders a VoltraElement based on its type
struct VoltraElementView: View {
    let element: VoltraElement

    var body: some View {
        switch element.type {
        case "Button":
            VoltraButton(element)

        case "VStack":
            VoltraVStack(element)

        case "HStack":
            VoltraHStack(element)

        case "ZStack":
            VoltraZStack(element)

        case "Text":
            VoltraText(element)

        case "Image":
            VoltraImage(element)

        case "Symbol":
            VoltraSymbol(element)

        case "Divider":
            VoltraDivider(element)

        case "Spacer":
            VoltraSpacer(element)

        case "Label":
            VoltraLabel(element)

        case "Toggle":
            VoltraToggle(element)

        case "Gauge":
            VoltraGauge(element)

        case "LinearProgressView":
            VoltraLinearProgressView(element)

        case "CircularProgressView":
            VoltraCircularProgressView(element)

        case "Timer":
            VoltraTimer(element)

        case "GroupBox":
            VoltraGroupBox(element)

        case "LinearGradient":
            VoltraLinearGradient(element)

        case "GlassContainer":
            VoltraGlassContainer(element)

        case "Mask":
            VoltraMask(element)

        default:
            EmptyView()
        }
    }
}