import SwiftUI

/// Voltra: GlassContainer (iOS 18+)
///
/// Wraps child views in a GlassEffectContainer so any child that applies `.glassEffect` will be
/// composed as a unified "liquid" surface. On iOS < 26, this simply renders the children.
public struct VoltraGlassContainer: View {
    private let node: VoltraNode

    public init(_ node: VoltraNode) {
        self.node = node
    }

    public var body: some View {
        let params = node.parameters(GlassContainerParameters.self)

        if let children = node.children {
            if #available(iOS 26.0, *) {
                let spacing = params.spacing ?? 0.0
                GlassEffectContainer(spacing: CGFloat(spacing)) {
                    VoltraChildrenView(children: children)
                }.applyStyle(node.style)
            } else {
                Group {
                    VoltraChildrenView(children: children)
                }.applyStyle(node.style)
            }
        } else {
            EmptyView();
        }
    }
}
