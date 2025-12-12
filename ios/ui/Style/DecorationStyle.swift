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
            // If we have a corner radius, we must handle the border specifically here
            .ifLet(style.cornerRadius) { content, radius in
                if let border = style.border {
                    content
                        .cornerRadius(radius)
                        .overlay(
                            RoundedRectangle(cornerRadius: radius)
                                .stroke(border.color, lineWidth: border.width)
                        )
                } else {
                    content.cornerRadius(radius)
                }
            }
            // Fallback: If there is NO corner radius, but there IS a border
            .voltraIf(style.cornerRadius == nil && style.border != nil) { content in
                content.border(style.border!.color, width: style.border!.width)
            }
            .voltraIf(style.overflow == .hidden) { view in
                view.clipped()
            }
            .ifLet(style.shadow) { content, shadow in
                content
                    .compositingGroup()
                    .shadow(
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
