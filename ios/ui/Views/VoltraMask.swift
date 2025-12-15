import SwiftUI

/// Voltra: Mask
///
/// Masks content using any Voltra element as the mask shape.
/// The alpha channel of the maskElement determines visibility.
@available(iOS 15.0, macOS 12.0, *)
public struct VoltraMask: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        // Get the mask element from node props
        let maskElement = node.componentProp("maskElement")

        // Render children as the content to be masked
        VoltraChildrenView(node: node)
            .mask {
                if let maskElement = maskElement {
                    VoltraChildrenRenderer(children: maskElement)
                } else {
                    // Fallback: if no maskElement provided, show nothing
                    EmptyView()
                }
            }
            .applyStyle(node.style)
    }
}

