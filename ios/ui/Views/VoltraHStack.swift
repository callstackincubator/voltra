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
    let gap = layout.gap ?? 0

    HStack(alignment: alignment, spacing: gap) {
      element.children ?? .empty
    }
    .applyStyle(element.style)
  }

  @ViewBuilder
  private func flexBody(params: HStackParameters) -> some View {
    let alignmentFallback = FlexContainerHelper.horizontalAlignmentFallback(params.alignment)
    let values = FlexContainerHelper.parseValues(from: element, alignmentFallback: alignmentFallback)

    VoltraFlexStackLayout(
      axis: .horizontal,
      spacing: values.gap,
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
