import SwiftUI

public struct VoltraSpacer: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(SpacerParameters.self)
        Spacer(minLength: params.minLength.map { CGFloat($0) })
            .applyStyle(node.style)
    }
}
