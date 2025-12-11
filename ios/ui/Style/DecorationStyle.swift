import SwiftUI

struct DecorationStyle {
    var backgroundColor: Color?
    var cornerRadius: CGFloat?
    var border: (width: CGFloat, color: Color)?
    var shadow: (radius: CGFloat, color: Color, opacity: Double, offset: CGSize)?
    var glassEffect: GlassEffect?
    var overflow: Overflow?
}

struct DecorationModifier: ViewModifier {
    let style: DecorationStyle

    func body(content: Content) -> some View {
        content
            .ifLet(style.backgroundColor) { content, color in
                content.background(color)
            }
            .ifLet(style.cornerRadius) { content, cornerRadius in 
                content.cornerRadius(cornerRadius)
            }
            .ifLet(style.border) { content, border in
                content.border(border.color, width: border.width)
            }
            .voltraIf(style.overflow == .hidden) { view in
                view.clipped()
            }
            .ifLet(style.shadow) { content, shadow in
                content.shadow(
                    color: shadow.color.opacity(shadow.opacity),
                    radius: shadow.radius,
                    x: shadow.offset.width,
                    y: shadow.offset.height
                )
            }
            .ifLet(style.glassEffect) { content, glassEffect in
                if #available(iOS 26.0, *) {
                    switch glassEffect {
                        case .clear:
                            content.glassEffect(.clear)
                        case .identity:
                            content.glassEffect(.identity)
                        case .regular:
                            content.glassEffect(.regular)
                        case .none:
                            content
                    }
                } else {
                   content
                }
            }
    }
}
