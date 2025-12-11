import SwiftUI

/// Voltra: GlassContainer (iOS 18+)
///
/// Wraps child views in a GlassEffectContainer so any child that applies `.glassEffect` will be
/// composed as a unified "liquid" surface. On iOS < 26, this simply renders the children.
public struct VoltraGlassContainer: View {
    private let component: VoltraComponent
    
    public init(_ component: VoltraComponent) {
        self.component = component
    }

    public var body: some View {
        let params = component.parameters(GlassContainerParameters.self)

        if let children = component.children {
            if #available(iOS 26.0, *) {
                let spacing = params.spacing ?? 0.0
                GlassEffectContainer(spacing: CGFloat(spacing)) {
                    VoltraChildrenView(children: children)
                }.voltraModifiers(component)
            } else {
                Group {
                    VoltraChildrenView(children: children)
                }.voltraModifiers(component)
            }
        } else {
            EmptyView();
        }
    }
}
