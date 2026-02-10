import SwiftUI

// MARK: - Shared Flex Container Rendering

/// Shared values computed from a flex container's style
struct FlexContainerValues {
  let padding: EdgeInsets
  let alignItems: FlexAlign
  let justifyContent: FlexJustify
  let gap: CGFloat
  let layout: LayoutStyle
  let decoration: DecorationStyle
  let rendering: RenderingStyle
}

enum FlexContainerHelper {
  /// Parse flex container values from an element's style dictionary.
  /// `alignmentMapping` converts component-specific alignment strings (e.g. "leading", "top")
  /// to FlexAlign values, used as fallback when alignItems isn't set in style.
  static func parseValues(
    from element: VoltraElement,
    alignmentFallback: FlexAlign = .stretch
  ) -> FlexContainerValues {
    let anyStyle = element.style?.mapValues { $0.toAny() } ?? [:]
    let (layout, decoration, rendering, _) = StyleConverter.convert(anyStyle)

    let alignItemsFromStyle = (anyStyle["alignItems"] as? String).flatMap { FlexAlign(fromStyle: $0) }
    let justifyContentFromStyle = (anyStyle["justifyContent"] as? String).flatMap { FlexJustify(fromStyle: $0) }

    let finalAlignItems = alignItemsFromStyle ?? alignmentFallback
    let justifyContent = justifyContentFromStyle ?? .flexStart
    let gap = layout.gap ?? 0

    return FlexContainerValues(
      padding: layout.padding ?? EdgeInsets(),
      alignItems: finalAlignItems,
      justifyContent: justifyContent,
      gap: gap,
      layout: layout,
      decoration: decoration,
      rendering: rendering
    )
  }

  /// Map a VStack alignment string to a FlexAlign fallback
  static func verticalAlignmentFallback(_ alignment: String) -> FlexAlign {
    switch alignment.lowercased() {
    case "leading": return .flexStart
    case "trailing": return .flexEnd
    case "center": return .center
    default: return .stretch
    }
  }

  /// Map an HStack alignment string to a FlexAlign fallback
  static func horizontalAlignmentFallback(_ alignment: String) -> FlexAlign {
    switch alignment.lowercased() {
    case "top": return .flexStart
    case "bottom": return .flexEnd
    case "center": return .center
    default: return .stretch
    }
  }
}

// MARK: - Flex Container View Modifier

/// Applies layout, decoration, rendering, margin, offset, positioning, and zIndex
/// to a flex container — everything except padding (handled by the flex engine).
/// Also sets FlexItemLayoutKey so this view can be a flex child of another container.
struct FlexContainerStyleModifier: ViewModifier {
  let values: FlexContainerValues

  func body(content: Content) -> some View {
    let layout = values.layout
    let layoutWithoutPadding: LayoutStyle = {
      var l = layout
      l.padding = nil
      return l
    }()

    content
      .modifier(LayoutModifier(style: layoutWithoutPadding))
      .modifier(DecorationModifier(style: values.decoration))
      .modifier(RenderingModifier(style: values.rendering))
      .voltraIfLet(layout.margin) { c, margin in
        c.background(.clear).padding(margin)
      }
      .voltraIfLet(layout.relativeOffset) { c, offset in
        c.offset(x: offset.x, y: offset.y)
      }
      .voltraIfLet(layout.absolutePosition) { c, position in
        c.position(x: position.x, y: position.y)
      }
      .voltraIfLet(layout.zIndex) { c, z in
        c.zIndex(z)
      }
      // Set FlexItemLayoutKey so this container can be a flex child of another container
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
  }
}
