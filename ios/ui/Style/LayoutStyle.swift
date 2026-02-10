import SwiftUI

// DO NOT PUT DEFAULT VALUES IN THE STRUCTURES.
// ONLY USE OPTIONALS.

// MARK: - Size Value

enum SizeValue: Equatable {
  case fixed(CGFloat) // Explicit numeric value (e.g., 100)
  case fill // "100%" — expand to fill available space
  case wrap // "auto" or missing — size to content
}

// MARK: - Flex Alignment

enum FlexAlign: String {
  case flexStart = "flex-start"
  case center
  case flexEnd = "flex-end"
  case stretch

  /// Accept both kebab-case ("flex-start") and camelCase ("flexStart")
  init?(fromStyle value: String) {
    if let v = FlexAlign(rawValue: value) {
      self = v
    } else {
      switch value {
      case "flexStart": self = .flexStart
      case "flexEnd": self = .flexEnd
      default: return nil
      }
    }
  }
}

enum FlexJustify: String {
  case flexStart = "flex-start"
  case center
  case flexEnd = "flex-end"
  case spaceBetween = "space-between"
  case spaceAround = "space-around"
  case spaceEvenly = "space-evenly"

  /// Accept both kebab-case ("space-between") and camelCase ("spaceBetween")
  init?(fromStyle value: String) {
    if let v = FlexJustify(rawValue: value) {
      self = v
    } else {
      switch value {
      case "flexStart": self = .flexStart
      case "flexEnd": self = .flexEnd
      case "spaceBetween": self = .spaceBetween
      case "spaceAround": self = .spaceAround
      case "spaceEvenly": self = .spaceEvenly
      default: return nil
      }
    }
  }
}

// MARK: - Layout Style

struct LayoutStyle {
  // 1. Size Constraints (now SizeValue for "auto"/"100%" support)
  var width: SizeValue?
  var height: SizeValue?
  var minWidth: CGFloat?
  var maxWidth: CGFloat?
  var minHeight: CGFloat?
  var maxHeight: CGFloat?

  // 2. Flex properties (defaults applied in StyleConverter, not here)
  var flex: CGFloat? // Shorthand (legacy compat)
  var flexGrow: CGFloat // Default: 0 (applied in StyleConverter)
  var flexShrink: CGFloat // Default: 0 (applied in StyleConverter)
  var flexBasis: SizeValue? // nil = auto
  var alignSelf: FlexAlign? // nil = auto (inherit from container)
  var gap: CGFloat? // Spacing between flex children

  // 3. Priority (legacy only, derived from flex)
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

// MARK: - Layout Modifier

struct LayoutModifier: ViewModifier {
  let style: LayoutStyle

  // Extract CGFloat from SizeValue for frame constraints
  private var widthValue: CGFloat? {
    guard case let .fixed(v) = style.width else { return nil }
    return v
  }

  private var heightValue: CGFloat? {
    guard case let .fixed(v) = style.height else { return nil }
    return v
  }

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
        idealWidth: widthValue,
        maxWidth: widthValue ?? style.maxWidth,
        minHeight: style.minHeight,
        idealHeight: heightValue,
        maxHeight: heightValue ?? style.maxHeight
      )

      // C. Flex / Grow Logic (legacy: expand to infinity)
      // If flex > 0 OR width/height is .fill, expand to .infinity
      .frame(
        maxWidth: shouldExpandWidth ? .infinity : nil,
        maxHeight: shouldExpandHeight ? .infinity : nil,
        // SwiftUI defaults frame alignment to center. When expanding to fill,
        // we want RN-like flex-start behavior so content stays top/leading.
        alignment: (style.flex ?? 0) > 0 ? .topLeading : .center
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

  // Expand if flex > 0 OR width/height is .fill
  private var shouldExpandWidth: Bool {
    (style.flex ?? 0) > 0 || style.width == .fill
  }

  private var shouldExpandHeight: Bool {
    (style.flex ?? 0) > 0 || style.height == .fill
  }
}
