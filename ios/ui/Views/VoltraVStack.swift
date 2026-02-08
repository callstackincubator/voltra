import SwiftUI

public struct VoltraVStack: View {
  private let element: VoltraElement

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
    params: VStackParameters,
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
      case "leading": .flexStart
      case "trailing": .flexEnd
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
    let params = element.parameters(VStackParameters.self)

    if params.layout == "flex" {
      flexBody(params: params)
    } else {
      legacyBody(params: params)
    }
  }

  @ViewBuilder
  private func legacyBody(params: VStackParameters) -> some View {
    let alignmentStr = params.alignment.lowercased()
    let alignment: HorizontalAlignment = switch alignmentStr {
    case "leading": .leading
    case "trailing": .trailing
    case "center": .center
    default: .center
    }

    VStack(alignment: alignment, spacing: params.spacing) {
      element.children ?? .empty
    }
    .applyStyle(element.style)
  }

  @ViewBuilder
  private func flexBody(params: VStackParameters) -> some View {
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
      axis: .vertical,
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
