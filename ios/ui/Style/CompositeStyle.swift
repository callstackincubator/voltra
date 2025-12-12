import SwiftUI

struct CompositeStyleModifier: ViewModifier {
    let layout: LayoutStyle
    let decoration: DecorationStyle
    let rendering: RenderingStyle
    
    func body(content: Content) -> some View {
        content
            // 1. Apply Layout (Inner Padding & Size)
            .modifier(LayoutModifier(style: layout))
            
            // 2. Apply Decoration (Background, Border, Shadow)
            .modifier(DecorationModifier(style: decoration))

            // 3. Apply Rendering (Opacity)
            .modifier(RenderingModifier(style: rendering))
            
            // 4. Apply Outer Margin (Must happen last!)
            .voltraIfLet(layout.margin) { content, margin in
                content.background(.clear).padding(margin)
            }
    }
}
