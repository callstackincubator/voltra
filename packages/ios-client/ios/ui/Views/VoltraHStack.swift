import SwiftUI

public struct VoltraHStack: VoltraView {
  public typealias Parameters = HStackParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
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

    // Extract gap from style for legacy mode too
    let anyStyle = element.style?.mapValues { $0.toAny() } ?? [:]
    let (layout, _, _, _) = StyleConverter.convert(anyStyle)
    // spacing prop takes precedence over gap style
    let gap = params.spacing ?? layout.gap ?? 0

    let hasFillHeight = layout.height == .fill

    let frameAlignment = Alignment(horizontal: .center, vertical: alignment)

    HStack(alignment: alignment, spacing: gap) {
      element.children ?? .empty
    }
    .voltraIf(hasFillHeight) { content in
      content.frame(maxHeight: .infinity, alignment: frameAlignment)
    }
    .applyStyle(element.style, contentAlignment: frameAlignment)
  }

  @ViewBuilder
  private func flexBody(params: HStackParameters) -> some View {
    let alignmentFallback = FlexContainerHelper.horizontalAlignmentFallback(params.alignment)
    let values = FlexContainerHelper.parseValues(from: element, alignmentFallback: alignmentFallback)
    // spacing prop takes precedence over gap style
    let spacing = params.spacing ?? values.gap

    VoltraFlexStackLayout(
      axis: .horizontal,
      spacing: spacing,
      alignItems: values.alignItems,
      justifyContent: values.justifyContent,
      containerPadding: values.padding
    ) {
      (element.children ?? .empty)
        .environment(\.isInFlexContainer, true)
    }
    .modifier(FlexContainerStyleModifier(values: values))
  }
}
