import SwiftUI

struct TextStyle {
    var color: Color = .primary
    var fontSize: CGFloat = 17
    var fontWeight: Font.Weight = .regular
    var alignment: TextAlignment = .leading
    var lineLimit: Int? = nil
    var lineSpacing: CGFloat = 0 // Extra space between lines
    var decoration: TextDecoration = .none
    var letterSpacing: CGFloat = 0 // Kerning
    var lineHeight: CGFloat? // Used for calculating spacing
    var fontVariant: Set<FontVariant> = []
    
}

struct TextStyleModifier: ViewModifier {
    let style: TextStyle

    func body(content: Content) -> some View {
        content
            // 1. Font Construction
            // We build the system font dynamically based on config
            .font(.system(size: style.fontSize, weight: style.fontWeight))
            
            // 2. Color
            .foregroundColor(style.color)
            
            // 3. Layout / Spacing
            .multilineTextAlignment(style.alignment)
            .lineLimit(style.lineLimit)
            .lineSpacing(style.lineSpacing)
    }
}