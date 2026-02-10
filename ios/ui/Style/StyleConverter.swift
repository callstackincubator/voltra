import SwiftUI

enum StyleConverter {
  static func convert(_ js: [String: Any]) -> (LayoutStyle, DecorationStyle, RenderingStyle, TextStyle) {
    (parseLayout(js), parseDecoration(js), parseRendering(js), parseText(js))
  }

  private static func parseLayout(_ js: [String: Any]) -> LayoutStyle {
    // RN: "flex: 1" implies grow. "flexGrow" is specific.
    let flexVal = JSStyleParser.number(js["flex"]) ?? 0
    let flexGrowVal = JSStyleParser.number(js["flexGrow"]) ?? 0
    let flexShrinkVal = JSStyleParser.number(js["flexShrink"])
    let flexBasisVal = JSStyleParser.sizeValue(js["flexBasis"])

    // Legacy flex: max of flex and flexGrow for backward compat
    let finalFlex = max(flexVal, flexGrowVal)
    let priority: Double? = finalFlex > 0 ? 1.0 : nil

    // RN flex shorthand: flex > 0 → grow=flex, shrink=1, basis=0
    let resolvedFlexGrow: CGFloat
    let resolvedFlexShrink: CGFloat
    let resolvedFlexBasis: SizeValue?

    if flexVal > 0 {
      resolvedFlexGrow = flexGrowVal > 0 ? flexGrowVal : flexVal
      resolvedFlexShrink = flexShrinkVal ?? 1
      resolvedFlexBasis = flexBasisVal ?? .fixed(0)
    } else {
      resolvedFlexGrow = flexGrowVal
      resolvedFlexShrink = flexShrinkVal ?? 0
      resolvedFlexBasis = flexBasisVal // nil = auto
    }

    // Apply defaults here: 0 if not set (instead of in modifiers)
    let finalFlexGrow: CGFloat = resolvedFlexGrow
    let finalFlexShrink: CGFloat = resolvedFlexShrink

    // alignSelf
    let alignSelf: FlexAlign? = (js["alignSelf"] as? String).flatMap { FlexAlign(fromStyle: $0) }

    // gap
    let gap = JSStyleParser.number(js["gap"])

    // Position parsing with mode support
    let left = JSStyleParser.number(js["left"])
    let top = JSStyleParser.number(js["top"])

    var absolutePosition: CGPoint?
    var relativeOffset: CGPoint?

    // Only apply positioning if left or top are provided
    if left != nil || top != nil {
      let x = left ?? 0
      let y = top ?? 0

      // Default to 'absolute' if position mode not specified (backward compatibility)
      let positionMode = js["position"] as? String ?? "absolute"

      switch positionMode.lowercased() {
      case "absolute":
        absolutePosition = CGPoint(x: x, y: y)
      case "relative":
        relativeOffset = CGPoint(x: x, y: y)
      case "static":
        // Do nothing - ignore left/top
        break
      default:
        // Unknown position value - ignore
        break
      }
    }

    // zIndex: only set if explicitly provided in JS
    let zIndex = JSStyleParser.number(js["zIndex"])

    return LayoutStyle(
      // Dimensions (now using SizeValue)
      width: JSStyleParser.sizeValue(js["width"]),
      height: JSStyleParser.sizeValue(js["height"]),
      minWidth: JSStyleParser.number(js["minWidth"]),
      maxWidth: JSStyleParser.number(js["maxWidth"]),
      minHeight: JSStyleParser.number(js["minHeight"]),
      maxHeight: JSStyleParser.number(js["maxHeight"]),

      // Flex Logic
      flex: finalFlex > 0 ? finalFlex : nil,
      flexGrow: finalFlexGrow,
      flexShrink: finalFlexShrink,
      flexBasis: resolvedFlexBasis,
      alignSelf: alignSelf,
      gap: gap,
      layoutPriority: priority,
      aspectRatio: JSStyleParser.number(js["aspectRatio"]),

      // Spacing (Resolves logic: padding -> paddingHorizontal -> paddingLeft)
      padding: JSStyleParser.parseInsets(from: js, prefix: "padding"),
      margin: JSStyleParser.parseInsets(from: js, prefix: "margin"),

      // Positioning
      absolutePosition: absolutePosition,
      relativeOffset: relativeOffset,
      zIndex: zIndex.map { Double($0) }
    )
  }

  private static func parseDecoration(_ js: [String: Any]) -> DecorationStyle {
    // Border Logic
    var border: (CGFloat, Color)?
    if let borderWidth = JSStyleParser.number(js["borderWidth"]), borderWidth > 0 {
      let borderColor = JSStyleParser.color(js["borderColor"]) ?? .clear
      border = (borderWidth, borderColor)
    }

    // Shadow Logic (RN iOS style)
    var shadow: (CGFloat, Color, Double, CGSize)?

    let radius = JSStyleParser.number(js["shadowRadius"])
    let opacity = JSStyleParser.number(js["shadowOpacity"])
    let offset = JSStyleParser.size(js["shadowOffset"])
    let color = JSStyleParser.color(js["shadowColor"])

    if radius != nil || opacity != nil || offset != nil || color != nil {
      let finalRadius = radius ?? 0.0
      let finalOpacity = opacity ?? 1.0
      let finalOffset = offset ?? .zero
      let finalColor = color ?? .black

      if finalOpacity > 0 {
        shadow = (finalRadius, finalColor, Double(finalOpacity), finalOffset)
      }
    }

    let glassEffect = JSStyleParser.glassEffect(js["glassEffect"])
    let overflow = JSStyleParser.overflow(js["overflow"])

    return DecorationStyle(
      backgroundColor: JSStyleParser.color(js["backgroundColor"]),
      cornerRadius: JSStyleParser.number(js["borderRadius"]),
      border: border,
      shadow: shadow,
      glassEffect: glassEffect,
      overflow: overflow
    )
  }

  private static func parseRendering(_ js: [String: Any]) -> RenderingStyle {
    RenderingStyle(
      opacity: JSStyleParser.number(js["opacity"]) ?? 1.0,
      transform: JSStyleParser.transform(js["transform"])
    )
  }

  private static func parseText(_ js: [String: Any]) -> TextStyle {
    var style = TextStyle()

    if let color = JSColorParser.parse(js["color"]) {
      style.color = color
    }

    if let size = JSStyleParser.number(js["fontSize"]) {
      style.fontSize = size
    }

    // CSS LineHeight includes text size. SwiftUI LineSpacing is the extra space.
    if let lineHeight = JSStyleParser.number(js["lineHeight"]) {
      let spacing = lineHeight - style.fontSize
      style.lineSpacing = max(0, spacing)
    }

    if let weightRaw = js["fontWeight"] {
      style.fontWeight = JSStyleParser.fontWeight(weightRaw)
    }

    if let fontFamily = js["fontFamily"] as? String {
      style.fontFamily = fontFamily
    }

    if let alignRaw = js["textAlign"] {
      style.alignment = JSStyleParser.textAlignment(alignRaw)
    }

    if let decoRaw = js["textDecorationLine"] {
      style.decoration = JSStyleParser.textDecoration(decoRaw)
    }

    // 6. Numbers
    if let lines = js["numberOfLines"] as? Int {
      style.lineLimit = lines
    }

    if let letterSpacing = JSStyleParser.number(js["letterSpacing"]) {
      style.letterSpacing = letterSpacing
    }

    if let fontVariantRaw = js["fontVariant"] {
      style.fontVariant = JSStyleParser.fontVariant(fontVariantRaw)
    }

    return style
  }
}
