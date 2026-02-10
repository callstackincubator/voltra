import SwiftUI

// MARK: - TextAlignment Extension

extension TextAlignment {
  var horizontalAlignment: HorizontalAlignment {
    switch self {
    case .leading: return .leading
    case .center: return .center
    case .trailing: return .trailing
    }
  }
}

// MARK: - View Extension

extension View {
  func applyStyle(_ optionalStyle: [String: JSONValue]?) -> some View {
    voltraIfLet(optionalStyle) { _, rawStyle in
      let anyStyle = rawStyle.mapValues { $0.toAny() }
      let style = StyleConverter.convert(anyStyle)
      return self.applyStyle(style)
    }
  }

  func applyStyle(_ style: (LayoutStyle, DecorationStyle, RenderingStyle, TextStyle)) -> some View {
    let (layout, decoration, rendering, text) = style
    let frameAlignment = Alignment(horizontal: text.alignment.horizontalAlignment, vertical: .top)
    return self
      // 1. Text Properties (Propagate font size for measurement)
      .modifier(TextStyleModifier(style: text))
      // 2. Standard Box Model
      .modifier(CompositeStyleModifier(
        layout: layout, decoration: decoration, rendering: rendering,
        contentAlignment: frameAlignment
      ))
  }
}
