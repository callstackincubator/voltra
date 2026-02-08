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

    VStack(alignment: alignment, spacing: params.spacing) {
      element.children ?? .empty
    }
    .applyStyle(element.style)
  }

  @ViewBuilder
  private func flexBody(params: VStackParameters) -> some View {
    let alignmentFallback = FlexContainerHelper.verticalAlignmentFallback(params.alignment)
    let values = FlexContainerHelper.parseValues(from: element, alignmentFallback: alignmentFallback)

    VoltraFlexStackLayout(
      axis: .vertical,
      spacing: params.spacing,
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
