import SwiftUI

public struct VoltraHStack: VoltraView {
  public typealias Parameters = HStackParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  private struct FlexValues {
    let padding: EdgeInsets
    let alignItems: FlexAlign
    let justifyContent: FlexJustify
  }

  private static func computeFlexValues(
    anyStyle: [String: Any],
    layout: LayoutStyle,
    params: HStackParameters,
    element: VoltraElement
  ) -> FlexValues {
    let padding = layout.padding ?? EdgeInsets()
    let alignItemsFromStyle = (anyStyle["alignItems"] as? String).flatMap { FlexAlign(fromStyle: $0) }
    let justifyContentFromStyle = (anyStyle["justifyContent"] as? String).flatMap { FlexJustify(fromStyle: $0) }

    // Map alignment prop to alignItems if alignItems not explicitly set in style
    let finalAlignItems: FlexAlign
    if let explicitAlign = alignItemsFromStyle {
      finalAlignItems = explicitAlign
    } else if element.style?["alignItems"] == nil {
      let alignmentStr = params.alignment.lowercased()
      finalAlignItems = switch alignmentStr {
      case "top": .flexStart
      case "bottom": .flexEnd
      case "center": .center
      default: .stretch // RN default
      }
    } else {
      finalAlignItems = .stretch
    }

    let justifyContent = justifyContentFromStyle ?? .flexStart

    return FlexValues(
      padding: padding,
      alignItems: finalAlignItems,
      justifyContent: justifyContent
    )
  }

  public var body: some View {
    if params.layout == "flex" {
      flexBody(params: params)
    } else {
      legacyBody(params: params)
    }
  }

  @ViewBuilder
  private func legacyBody(params: HStackParameters) -> some View {
    let alignmentStr = params.alignment.lowercased()
    let alignment: VerticalAlignment = switch alignmentStr {
    case "top": .top
    case "bottom": .bottom
    case "center": .center
    case "firsttextbaseline": .firstTextBaseline
    case "lasttextbaseline": .lastTextBaseline
    default: .center
    }

    HStack(alignment: alignment, spacing: params.spacing) {
      element.children ?? .empty
    }
    .applyStyle(element.style)
  }

  @ViewBuilder
  private func flexBody(params: HStackParameters) -> some View {
    // Parse flex container style
    let anyStyle = element.style?.mapValues { $0.toAny() } ?? [:]
    let (layout, decoration, rendering, _) = StyleConverter.convert(anyStyle)

    // Parse flex container props and compute final values
    let computedValues = Self.computeFlexValues(
      anyStyle: anyStyle,
      layout: layout,
      params: params,
      element: element
    )

    // Apply container's own size constraints (without padding — that's in the flex engine)
    let layoutWithoutPadding: LayoutStyle = {
      var l = layout
      l.padding = nil
      return l
    }()

    VoltraFlexStackLayout(
      axis: .horizontal,
      spacing: params.spacing,
      alignItems: computedValues.alignItems,
      justifyContent: computedValues.justifyContent,
      containerPadding: computedValues.padding
    ) {
      (element.children ?? .empty)
        .environment(\.isInFlexContainer, true)
    }
    .modifier(LayoutModifier(style: layoutWithoutPadding))
    .modifier(DecorationModifier(style: decoration))
    .modifier(RenderingModifier(style: rendering))
    .voltraIfLet(layout.margin) { c, margin in
      c.background(.clear).padding(margin)
    }
    .voltraIfLet(layout.relativeOffset) { c, offset in
      c.offset(x: offset.x, y: offset.y)
    }
    .voltraIfLet(layout.absolutePosition) { c, position in
      c.position(x: position.x, y: position.y)
    }
    .voltraIfLet(layout.zIndex) { c, z in
      c.zIndex(z)
    }
  }
}
