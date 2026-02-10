import SwiftUI

struct CompositeStyleModifier: ViewModifier {
  @Environment(\.isInFlexContainer) var isInFlexContainer

  let layout: LayoutStyle
  let decoration: DecorationStyle
  let rendering: RenderingStyle

  func body(content: Content) -> some View {
    Group {
      if isInFlexContainer {
        // FLEX CHILD PATH:
        // 1. Skip LayoutModifier (no .frame() — parent layout controls sizing)
        // 2. Apply padding (inner spacing is still the child's responsibility)
        // 3. Apply decoration + rendering
        // 4. Attach LayoutValueKey for parent flex layout to read

        content
          .voltraIfLet(layout.padding) { c, p in c.padding(p) }
          .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
          .modifier(DecorationModifier(style: decoration))
          .modifier(RenderingModifier(style: rendering))
          .layoutValue(key: FlexItemLayoutKey.self, value: FlexItemValues(
            flexGrow: layout.flexGrow,
            flexShrink: layout.flexShrink,
            flexBasis: layout.flexBasis,
            width: layout.width,
            height: layout.height,
            minWidth: layout.minWidth,
            maxWidth: layout.maxWidth,
            minHeight: layout.minHeight,
            maxHeight: layout.maxHeight,
            alignSelf: layout.alignSelf,
            margin: layout.margin,
            aspectRatio: layout.aspectRatio
          ))
      } else {
        // LEGACY PATH: unchanged
        content
          .modifier(LayoutModifier(style: layout))
          .modifier(DecorationModifier(style: decoration))
          .modifier(RenderingModifier(style: rendering))
      }
    }
    // Margin (flex engine handles margin via LayoutValueKey;
    // in legacy mode, applied as SwiftUI padding)
    .voltraIf(!isInFlexContainer) { content in
      content.voltraIfLet(layout.margin) { c, margin in
        c.background(.clear).padding(margin)
      }
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
    // CRITICAL: Reset environment so nested children behave normally
    .environment(\.isInFlexContainer, false)
  }
}
