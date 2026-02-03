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

      // Apply relative positioning (offset from natural position)
      .voltraIfLet(layout.relativeOffset) { content, offset in
        content.offset(x: offset.x, y: offset.y)
      }
      // Apply absolute positioning (center-based)
      .voltraIfLet(layout.absolutePosition) { content, position in
        content.position(x: position.x, y: position.y)
      }
      .voltraIfLet(layout.zIndex) { content, zIndex in
        content.zIndex(zIndex)
      }
  }
}
