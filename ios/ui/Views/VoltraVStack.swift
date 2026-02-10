import SwiftUI

public struct VoltraVStack: View {
  private let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
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

    // Extract gap from style for legacy mode too
    let anyStyle = element.style?.mapValues { $0.toAny() } ?? [:]
    let (layout, _, _, _) = StyleConverter.convert(anyStyle)
    let gap = layout.gap ?? 0

    let hasFillWidth = layout.width == .fill

    VStack(alignment: alignment, spacing: gap) {
      element.children ?? .empty
    }
    .voltraIf(hasFillWidth) { content in
      content.frame(maxWidth: .infinity, alignment: Alignment(horizontal: alignment, vertical: .center))
    }
    .applyStyle(element.style)
  }

  @ViewBuilder
  private func flexBody(params: VStackParameters) -> some View {
    let alignmentFallback = FlexContainerHelper.verticalAlignmentFallback(params.alignment)
    let values = FlexContainerHelper.parseValues(from: element, alignmentFallback: alignmentFallback)

    VoltraFlexStackLayout(
      axis: .vertical,
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
