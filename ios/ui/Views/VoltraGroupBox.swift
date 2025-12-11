import SwiftUI

public struct VoltraGroupBox: View {
    private let component: VoltraComponent

    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let label = component.componentProp("label")

        GroupBox {
            VoltraChildrenView(component: component)
        } label: {
            buildNestedView(label)
        }
        .applyStyle(component.style)
    }

    @ViewBuilder
    private func buildNestedView(_ optionalNestedView: VoltraChildren?) -> some View {
        if let nestedView = optionalNestedView {
            VoltraChildrenRenderer(children: nestedView)
        } else {
            EmptyView()
        }
    }
}
