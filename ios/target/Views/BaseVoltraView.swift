import SwiftUI

/// Public reusable view that renders VoltraChildren directly
/// This can be used whenever you have VoltraChildren (from component props, children, etc.)
public struct VoltraChildrenRenderer: View {
    public let children: VoltraChildren
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(children: VoltraChildren) {
        self.children = children
    }
    
    @ViewBuilder
    public var body: some View {
        switch children {
        case .component(let childComponent):
            voltraEnvironment.buildView([childComponent])
        case .components(let components):
            voltraEnvironment.buildView(components)
        case .text:
            EmptyView()
        }
    }
}

/// Helper view that builds children for a VoltraComponent
/// This view accesses the environment internally and builds child views recursively
public struct VoltraChildrenView: View {
    public let component: VoltraComponent
    
    public init(component: VoltraComponent) {
        self.component = component
    }
    
    @ViewBuilder
    public var body: some View {
        if let children = component.children {
            VoltraChildrenRenderer(children: children)
        }
    }
}


