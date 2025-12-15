import SwiftUI

public struct VoltraDivider: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        Divider()
            .applyStyle(node.style)
    }
}
