import SwiftUI

extension View {
    func applyStyle(_ optionalStyle: [String: Any]?) -> some View {
        self.voltraIfLet(optionalStyle) { content, rawStyle in
            let style = StyleConverter.convert(rawStyle)
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
