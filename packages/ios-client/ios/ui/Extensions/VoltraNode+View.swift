import Foundation
import SwiftUI

/// The AST itself lives in `shared/` and knows nothing about SwiftUI. Rendering is attached
/// here so `shared/` stays free of any dependency on `ui/` and can be compiled — and tested —
/// on its own. Both directories are built into a single module by the podspecs, so call sites
/// keep using a `VoltraNode` directly as a view.
extension VoltraNode: View {
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

  var body: some View {
    switch element.type {
    case "Button":
      VoltraButton(element)

    case "Link":
      VoltraLink(element)

    case "VStack":
      VoltraVStack(element)

    case "HStack":
      VoltraHStack(element)

    case "View":
      VoltraFlexView(element)

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

    case "Chart":
      if #available(iOS 16.0, macOS 13.0, *) {
        VoltraChart(element)
      }

    default:
      EmptyView()
    }
  }
}
