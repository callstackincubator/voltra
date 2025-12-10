import SwiftUI

/// Public reusable view that renders VoltraChildren directly
/// This can be used whenever you have VoltraChildren (from component props, children, etc.)
public struct VoltraChildrenRenderer: View {
    public let children: VoltraChildren
    
    public init(children: VoltraChildren) {
        self.children = children
    }
    
    @ViewBuilder
    public var body: some View {
        switch children {
        case .component(let childComponent):
            VoltraChildrenView(components: [childComponent])
        case .components(let components):
            VoltraChildrenView(components: components)
        case .text:
            EmptyView()
        }
    }
}
