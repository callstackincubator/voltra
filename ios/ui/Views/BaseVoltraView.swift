import SwiftUI

/// Public reusable view that renders VoltraChildren directly
/// This can be used whenever you have VoltraChildren (from node props, children, etc.)
public struct VoltraChildrenRenderer: View {
    public let children: VoltraChildren
    
    public init(children: VoltraChildren) {
        self.children = children
    }
    
    @ViewBuilder
    public var body: some View {
        switch children {
        case .node(let childNode):
            VoltraChildrenView(nodes: [childNode])
        case .nodes(let nodes):
            VoltraChildrenView(nodes: nodes)
        case .text:
            EmptyView()
        }
    }
}
