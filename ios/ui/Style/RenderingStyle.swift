import SwiftUI

struct RenderingStyle {
    var opacity: CGFloat = 1.0
    var transform: TransformStyle?
}

struct RenderingModifier: ViewModifier {
    let style: RenderingStyle

    func body(content: Content) -> some View {
        content
            .opacity(style.opacity)
            .modifier(TransformModifier(transform: style.transform))
    }
}

struct TransformModifier: ViewModifier {
    let transform: TransformStyle?
    
    func body(content: Content) -> some View {
        content
            .voltraIfLet(transform?.rotate) { view, degrees in
                view.rotationEffect(.degrees(degrees))
            }
            .voltraIfLet(transform?.scale) { view, scale in
                view.scaleEffect(scale)
            }
            .voltraIf(transform?.scale == nil && (transform?.scaleX != nil || transform?.scaleY != nil)) { view in
                view.scaleEffect(x: transform?.scaleX ?? 1.0, y: transform?.scaleY ?? 1.0)
            }
    }
}