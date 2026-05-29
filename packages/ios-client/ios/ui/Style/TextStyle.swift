import SwiftUI

struct TextStyle {
  var color: Color = .primary
  var lightDarkColors: (light: Color, dark: Color)? = nil
  var usesPrimaryColorInReducedPresentation = false
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

/// A ShapeStyle whose resolve(in:) is called by SwiftUI's rendering engine at draw time,
/// not during body evaluation. This is the correct hook for adaptive colors in WidgetKit
/// because the rendering engine passes the correct dark/light environment to resolve(in:)
/// even though @Environment(\.colorScheme) in body always reads as .light.
struct LightDarkForeground: ShapeStyle {
  let light: Color
  let dark: Color

  func resolve(in environment: EnvironmentValues) -> some ShapeStyle {
    environment.colorScheme == .dark ? dark : light
  }
}

struct TextStyleModifier: ViewModifier {
  let style: TextStyle
  @Environment(\.voltraEnvironment) private var voltraEnvironment

  private var resolvedColor: Color {
    if let widget = voltraEnvironment.widget,
       widget.usesReducedBackgroundPresentation,
       style.usesPrimaryColorInReducedPresentation
    {
      return .primary
    }

    return style.color
  }

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
      .foregroundColor(resolvedColor)
      // 3. Layout / Spacing
      .multilineTextAlignment(style.alignment)
      .lineLimit(style.lineLimit)
      .lineSpacing(style.lineSpacing)
  }
}
