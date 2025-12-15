import SwiftUI

public struct VoltraLabel: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(LabelParameters.self)
        if let systemImage = params.systemImage {
            Label(
                params.title ?? "Label",
                systemImage: systemImage
            )
            .applyStyle(node.style)
        } else {
            VoltraText(node)
                .applyStyle(node.style)
        }
    }
}
