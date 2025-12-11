import SwiftUI

struct RenderingStyle {
    var opacity: CGFloat = 1.0
}

struct RenderingModifier: ViewModifier {
    let style: RenderingStyle

    func body(content: Content) -> some View {
        content.opacity(style.opacity)
    }
}