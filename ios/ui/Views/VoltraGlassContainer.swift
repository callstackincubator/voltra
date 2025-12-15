import SwiftUI

/// Voltra: GlassContainer (iOS 18+)
///
/// Wraps child views in a GlassEffectContainer so any child that applies `.glassEffect` will be
/// composed as a unified "liquid" surface. On iOS < 26, this simply renders the children.
public struct VoltraGlassContainer: View {
    private let element: VoltraElement

    public init(_ element: VoltraElement) {
        self.element = element
    }

    public var body: some View {
        let params = element.parameters(GlassContainerParameters.self)

        if let children = element.children {
            if #available(iOS 26.0, *) {
                let spacing = params.spacing ?? 0.0
                GlassEffectContainer(spacing: CGFloat(spacing)) {
                    children
                }.applyStyle(element.style)
            } else {
                Group {
                    children
                }.applyStyle(element.style)
            }
        } else {
            EmptyView();
        }
    }
}
