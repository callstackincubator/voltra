import SwiftUI

struct LayoutStyle {
  // 1. Size Constraints (flexBasis + constraints)
  var width: CGFloat?
  var height: CGFloat?
  var minWidth: CGFloat?
  var maxWidth: CGFloat?
  var minHeight: CGFloat?
  var maxHeight: CGFloat?

  // 2. Flexibility
  // flex: 1 means "grow to fill available space"
  // flex: 0 means "size to content" (or fixed width)
  var flex: CGFloat = 0

  // 3. Priority (flexGrow equivalent)
  // Higher priority wins when space is tight
  var layoutPriority: Double?

  // 4. Aspect Ratio
  var aspectRatio: CGFloat?

  // 5. Spacing
  var padding: EdgeInsets?
  var margin: EdgeInsets?

  // 6. Positioning
  var absolutePosition: CGPoint? // for position: 'absolute'
  var relativeOffset: CGPoint? // for position: 'relative'
  var zIndex: Double?
}

struct LayoutModifier: ViewModifier {
  let style: LayoutStyle

  func body(content: Content) -> some View {
    content
      // A. Aspect Ratio (Must be applied before frames to impact sizing)
      .voltraIfLet(style.aspectRatio) { content, aspectRatio in
        content.aspectRatio(aspectRatio, contentMode: .fill)
      }

      // B. Fixed & Minimum Constraints
      // We apply min/max/fixed constraints first to establish the "base" size.
      .frame(
        minWidth: style.minWidth,
        idealWidth: style.width,
        maxWidth: style.width ?? style.maxWidth, // If width is set, it becomes the max
        minHeight: style.minHeight,
        idealHeight: style.height,
        maxHeight: style.height ?? style.maxHeight
      )

      // C. Flex / Grow Logic
      // If flex > 0, we override the max constraints to .infinity
      // allowing the view to expand to fill the stack.
      .frame(
        maxWidth: style.flex > 0 ? .infinity : nil,
        maxHeight: style.flex > 0 ? .infinity : nil
      )

      // D. Layout Priority (Flex Grow/Shrink arbitration)
      // Views with higher priority get their requested size first.
      .voltraIfLet(style.layoutPriority) { content, priority in
        content.layoutPriority(priority)
      }

      // E. Inner Spacing (Padding)
      .voltraIfLet(style.padding) { content, padding in
        content.padding(padding)
      }
  }
}
