import SwiftUI

public struct VoltraGroupBox: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let label = node.componentProp("label")

        GroupBox {
            VoltraChildrenView(node: node)
        } label: {
            buildNestedView(label)
        }
        .applyStyle(node.style)
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
