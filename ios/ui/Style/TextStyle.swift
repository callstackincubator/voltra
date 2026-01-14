import SwiftUI

struct TextStyle {
  var color: Color = .primary
  var fontSize: CGFloat = 17
  var fontWeight: Font.Weight = .regular
  var fontFamily: String?
  var alignment: TextAlignment = .leading
  var lineLimit: Int?
  var lineSpacing: CGFloat = 0 // Extra space between lines
  var decoration: TextDecoration = .none
  var letterSpacing: CGFloat = 0 // Kerning
  var lineHeight: CGFloat? // Used for calculating lineSpacing
  var fontVariant: Set<FontVariant> = []
}

struct TextStyleModifier: ViewModifier {
  let style: TextStyle

  func body(content: Content) -> some View {
    content
      // 1. Font Construction
      // We build the system font dynamically based on config
      // If fontFamily is specified, use custom font, otherwise use system font
      .font(
        style.fontFamily != nil
          ? .custom(style.fontFamily!, size: style.fontSize)
          : .system(size: style.fontSize, weight: style.fontWeight)
      )
      // 2. Color
      .foregroundColor(style.color)
      // 3. Layout / Spacing
      .multilineTextAlignment(style.alignment)
      .lineLimit(style.lineLimit)
      .lineSpacing(style.lineSpacing)
  }
}
