import SwiftUI

public struct VoltraGroupBox: VoltraView {
    public typealias Parameters = EmptyParameters

    public let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let label = element.componentProp("label")

        GroupBox {
            element.children ?? .empty
        } label: {
            buildNestedView(label)
        }
        .applyStyle(element.style)
    }

    @ViewBuilder
    private func buildNestedView(_ nestedView: VoltraNode) -> some View {
        nestedView
    }
}
