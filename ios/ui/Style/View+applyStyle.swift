import SwiftUI

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
    return self
      // 1. Text Properties (Propagate font size for measurement)
      .modifier(TextStyleModifier(style: text))
      // 2. Standard Box Model
      .modifier(CompositeStyleModifier(layout: layout, decoration: decoration, rendering: rendering))
  }
}
