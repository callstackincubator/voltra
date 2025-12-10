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
        Group {
            if let children = component.children {
                switch children {
                case .component(let childComponent):
                    if #available(iOS 26.0, *) {
                        let spacing = params.spacing ?? 0.0
                        GlassEffectContainer(spacing: CGFloat(spacing)) {
                            VoltraChildrenView(components: [childComponent])
                        }
                    } else {
                        VoltraChildrenView(components: [childComponent])
                    }
                case .components(let components):
                    if !components.isEmpty {
                        if #available(iOS 26.0, *) {
                            let spacing = params.spacing ?? 0.0
                            GlassEffectContainer(spacing: CGFloat(spacing)) {
                                VoltraChildrenView(components: components)
                            }
                        } else {
                            VoltraChildrenView(components: components)
                        }
                    } else {
                        EmptyView()
                    }
                case .text:
                    // GlassContainer shouldn't have text children, ignore
                    EmptyView()
                }
            } else {
                EmptyView()
            }
        }
        .voltraModifiers(component)
    }
}
