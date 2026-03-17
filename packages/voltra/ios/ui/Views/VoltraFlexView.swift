import SwiftUI

public struct VoltraFlexView: VoltraView {
  public typealias Parameters = ViewParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    let anyStyle = element.style?.mapValues { $0.toAny() } ?? [:]

    // flexDirection from style (default: column, matching RN's View behavior)
    let directionStr = anyStyle["flexDirection"] as? String ?? "column"
    let axis: Axis = directionStr == "row" ? .horizontal : .vertical

    let values = FlexContainerHelper.parseValues(from: element)

    VoltraFlexStackLayout(
      axis: axis,
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
