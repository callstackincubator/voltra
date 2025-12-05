import SwiftUI

/// Helper view that builds children for a VoltraComponent
/// This view accesses the environment internally and builds child views recursively
public struct VoltraChildrenView: View {
    public let component: VoltraComponent
    
    @Environment(\.voltraEnvironment)
    private var voltraEnvironment
    
    public init(component: VoltraComponent) {
        self.component = component
    }
    
    @ViewBuilder
    public var body: some View {
        if let children = component.children {
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
}

