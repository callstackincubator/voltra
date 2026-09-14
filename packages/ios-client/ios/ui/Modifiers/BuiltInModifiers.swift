import SwiftUI
import WidgetKit

/// The built-in catalog. Each entry mirrors one factory in `packages/ios/src/modifiers`, and the
/// shared fixture test fails when the two sides drift apart. Modifiers newer than the pod's
/// minimum iOS version check availability in `body` and leave the content unchanged when missing.
let builtInModifierDefinitions: [String: VoltraModifierDefinition] = [
  // MARK: Widgets and Live Activities

  "widgetURL": VoltraModifierDefinition(parameters: ["url"]) { params in
    guard let url = try URL(string: params.requiredString("url")) else { throw VoltraModifierError.invalidParameter("url") }
    return WidgetURLModifier(url: url)
  },
  "containerBackground": VoltraModifierDefinition(parameters: ["color"]) { params in
    try ContainerBackgroundModifier(color: params.requiredColor("color"))
  },
  "widgetAccentable": VoltraModifierDefinition(parameters: ["accentable"]) { params in
    try WidgetAccentableModifier(accentable: params.optionalBool("accentable") ?? true)
  },
  "privacySensitive": VoltraModifierDefinition(parameters: ["sensitive"]) { params in
    try PrivacySensitiveModifier(sensitive: params.optionalBool("sensitive") ?? true)
  },
  "redacted": VoltraModifierDefinition(parameters: ["reason"]) { params in
    try RedactedModifier(reason: params.requiredEnum("reason"))
  },
  "unredacted": VoltraModifierDefinition(parameters: []) { _ in
    UnredactedModifier()
  },
  "invalidatableContent": VoltraModifierDefinition(parameters: ["invalidatable"]) { params in
    try InvalidatableContentModifier(invalidatable: params.optionalBool("invalidatable") ?? true)
  },
  "activityBackgroundTint": VoltraModifierDefinition(parameters: ["color"]) { params in
    try ActivityBackgroundTintModifier(color: params.optionalColor("color"))
  },
  "activitySystemActionForegroundColor": VoltraModifierDefinition(parameters: ["color"]) { params in
    try ActivitySystemActionForegroundColorModifier(color: params.optionalColor("color"))
  },

  // MARK: Transitions and animation

  "contentTransition": VoltraModifierDefinition(parameters: ["transition", "countsDown"]) { params in
    try ContentTransitionModifier(kind: params.requiredEnum("transition"), countsDown: params.optionalBool("countsDown") ?? false)
  },
  "transition": VoltraModifierDefinition(parameters: ["transition", "edge"]) { params in
    try TransitionModifier(kind: params.requiredEnum("transition"), edge: params.optionalEnum("edge") ?? .bottom)
  },
  "animation": VoltraModifierDefinition(parameters: ["curve", "value", "duration"]) { params in
    guard let value = params["value"], value is String || value is NSNumber else {
      throw VoltraModifierError.missingParameter("value")
    }
    return try AnimationModifier(
      curve: params.requiredEnum("curve"),
      duration: params.optionalNumber("duration").map(Double.init),
      value: String(describing: value)
    )
  },
  "symbolEffect": VoltraModifierDefinition(parameters: ["effect"]) { params in
    try SymbolEffectModifier(effect: params.requiredEnum("effect"))
  },

  // MARK: Visual effects

  "clipShape": VoltraModifierDefinition(parameters: ["shape", "cornerRadius", "cornerStyle"]) { params in
    try ClipShapeModifier(params)
  },
  "blur": VoltraModifierDefinition(parameters: ["radius", "opaque"]) { params in
    try BlurModifier(radius: params.requiredNumber("radius"), opaque: params.optionalBool("opaque") ?? false)
  },
  "grayscale": VoltraModifierDefinition(parameters: ["amount"]) { params in
    try ColorAdjustmentModifier(kind: .grayscale, amount: Double(params.requiredNumber("amount")))
  },
  "saturation": VoltraModifierDefinition(parameters: ["amount"]) { params in
    try ColorAdjustmentModifier(kind: .saturation, amount: Double(params.requiredNumber("amount")))
  },
  "brightness": VoltraModifierDefinition(parameters: ["amount"]) { params in
    try ColorAdjustmentModifier(kind: .brightness, amount: Double(params.requiredNumber("amount")))
  },
  "contrast": VoltraModifierDefinition(parameters: ["amount"]) { params in
    try ColorAdjustmentModifier(kind: .contrast, amount: Double(params.requiredNumber("amount")))
  },
  "blendMode": VoltraModifierDefinition(parameters: ["mode"]) { params in
    try BlendModeModifier(mode: params.requiredEnum("mode", as: BlendModeName.self).blendMode)
  },

  // MARK: Geometry and layout

  "rotationEffect": VoltraModifierDefinition(parameters: ["degrees"]) { params in
    try RotationEffectModifier(degrees: Double(params.requiredNumber("degrees")))
  },
  "scaleEffect": VoltraModifierDefinition(parameters: ["x", "y"]) { params in
    try ScaleEffectModifier(x: params.optionalNumber("x") ?? 1, y: params.optionalNumber("y") ?? 1)
  },
  "offset": VoltraModifierDefinition(parameters: ["x", "y"]) { params in
    try OffsetModifier(x: params.optionalNumber("x") ?? 0, y: params.optionalNumber("y") ?? 0)
  },
  "fixedSize": VoltraModifierDefinition(parameters: ["horizontal", "vertical"]) { params in
    try FixedSizeModifier(horizontal: params.optionalBool("horizontal") ?? true, vertical: params.optionalBool("vertical") ?? true)
  },
  "layoutPriority": VoltraModifierDefinition(parameters: ["priority"]) { params in
    try LayoutPriorityModifier(priority: Double(params.requiredNumber("priority")))
  },
  "containerRelativeFrame": VoltraModifierDefinition(parameters: ["axes"]) { params in
    try ContainerRelativeFrameModifier(axes: params.requiredEnum("axes"))
  },
  "dynamicTypeSize": VoltraModifierDefinition(parameters: ["size"]) { params in
    try DynamicTypeSizeModifier(size: params.requiredEnum("size", as: DynamicTypeSizeName.self).size)
  },

  // MARK: Text

  "minimumScaleFactor": VoltraModifierDefinition(parameters: ["factor"]) { params in
    try MinimumScaleFactorModifier(factor: params.requiredNumber("factor"))
  },
  "truncationMode": VoltraModifierDefinition(parameters: ["mode"]) { params in
    try TruncationModeModifier(mode: params.requiredEnum("mode", as: TruncationModeName.self).mode)
  },
  "multilineTextAlignment": VoltraModifierDefinition(parameters: ["alignment"]) { params in
    try MultilineTextAlignmentModifier(alignment: params.requiredEnum("alignment", as: TextAlignmentName.self).alignment)
  },
  "monospacedDigit": VoltraModifierDefinition(parameters: []) { _ in
    MonospacedDigitModifier()
  },
]

// MARK: - Widgets and Live Activities

struct WidgetURLModifier: ViewModifier {
  let url: URL

  func body(content: Content) -> some View {
    content.widgetURL(url)
  }
}

struct ContainerBackgroundModifier: ViewModifier {
  let color: Color

  func body(content: Content) -> some View {
    if #available(iOS 17.0, macOS 14.0, *) {
      content.containerBackground(color, for: .widget)
    } else {
      content
    }
  }
}

struct WidgetAccentableModifier: ViewModifier {
  let accentable: Bool

  func body(content: Content) -> some View {
    content.widgetAccentable(accentable)
  }
}

struct PrivacySensitiveModifier: ViewModifier {
  let sensitive: Bool

  func body(content: Content) -> some View {
    content.privacySensitive(sensitive)
  }
}

struct RedactedModifier: ViewModifier {
  enum Reason: String {
    case placeholder, privacy, invalidated
  }

  let reason: Reason

  func body(content: Content) -> some View {
    switch reason {
    case .placeholder:
      content.redacted(reason: .placeholder)
    case .privacy:
      content.redacted(reason: .privacy)
    case .invalidated:
      if #available(iOS 17.0, macOS 14.0, *) {
        content.redacted(reason: .invalidated)
      } else {
        content
      }
    }
  }
}

struct UnredactedModifier: ViewModifier {
  func body(content: Content) -> some View {
    content.unredacted()
  }
}

struct InvalidatableContentModifier: ViewModifier {
  let invalidatable: Bool

  func body(content: Content) -> some View {
    if #available(iOS 17.0, macOS 14.0, *) {
      content.invalidatableContent(invalidatable)
    } else {
      content
    }
  }
}

struct ActivityBackgroundTintModifier: ViewModifier {
  let color: Color?

  func body(content: Content) -> some View {
    #if os(iOS)
      content.activityBackgroundTint(color)
    #else
      content
    #endif
  }
}

struct ActivitySystemActionForegroundColorModifier: ViewModifier {
  let color: Color?

  func body(content: Content) -> some View {
    #if os(iOS)
      content.activitySystemActionForegroundColor(color)
    #else
      content
    #endif
  }
}

// MARK: - Transitions and animation

struct ContentTransitionModifier: ViewModifier {
  enum Kind: String {
    case identity, opacity, interpolate, numericText, symbolEffect
  }

  let kind: Kind
  let countsDown: Bool

  func body(content: Content) -> some View {
    switch kind {
    case .identity:
      content.contentTransition(.identity)
    case .opacity:
      content.contentTransition(.opacity)
    case .interpolate:
      content.contentTransition(.interpolate)
    case .numericText:
      content.contentTransition(.numericText(countsDown: countsDown))
    case .symbolEffect:
      if #available(iOS 17.0, macOS 14.0, *) {
        content.contentTransition(.symbolEffect)
      } else {
        content
      }
    }
  }
}

struct TransitionModifier: ViewModifier {
  enum Kind: String {
    case identity, opacity, scale, slide, push, move
  }

  enum EdgeName: String {
    case top, bottom, leading, trailing

    var edge: Edge {
      switch self {
      case .top: .top
      case .bottom: .bottom
      case .leading: .leading
      case .trailing: .trailing
      }
    }
  }

  let kind: Kind
  let edge: EdgeName

  private var transition: AnyTransition {
    switch kind {
    case .identity: .identity
    case .opacity: .opacity
    case .scale: .scale
    case .slide: .slide
    case .push: .push(from: edge.edge)
    case .move: .move(edge: edge.edge)
    }
  }

  func body(content: Content) -> some View {
    content.transition(transition)
  }
}

struct AnimationModifier: ViewModifier {
  enum Curve: String {
    case `default`, linear, easeIn, easeOut, easeInOut, spring, bouncy, smooth, snappy
  }

  let curve: Curve
  let duration: Double?
  /// The JSON value the animation keys on, compared as text.
  let value: String

  private var animation: Animation {
    let duration = duration ?? 0.35
    switch curve {
    case .default: return .default
    case .linear: return .linear(duration: duration)
    case .easeIn: return .easeIn(duration: duration)
    case .easeOut: return .easeOut(duration: duration)
    case .easeInOut: return .easeInOut(duration: duration)
    case .spring: return .spring()
    case .bouncy, .smooth, .snappy:
      guard #available(iOS 17.0, macOS 14.0, *) else { return .default }
      switch curve {
      case .bouncy: return .bouncy(duration: duration)
      case .smooth: return .smooth(duration: duration)
      default: return .snappy(duration: duration)
      }
    }
  }

  func body(content: Content) -> some View {
    content.animation(animation, value: value)
  }
}

struct SymbolEffectModifier: ViewModifier {
  enum Effect: String {
    case pulse, variableColor, breathe, rotate, wiggle
  }

  let effect: Effect

  func body(content: Content) -> some View {
    if #available(iOS 18.0, macOS 15.0, *) {
      switch effect {
      case .pulse: content.symbolEffect(.pulse)
      case .variableColor: content.symbolEffect(.variableColor)
      case .breathe: content.symbolEffect(.breathe)
      case .rotate: content.symbolEffect(.rotate)
      case .wiggle: content.symbolEffect(.wiggle)
      }
    } else if #available(iOS 17.0, macOS 14.0, *) {
      switch effect {
      case .pulse: content.symbolEffect(.pulse)
      case .variableColor: content.symbolEffect(.variableColor)
      case .breathe, .rotate, .wiggle: content
      }
    } else {
      content
    }
  }
}

// MARK: - Visual effects

struct ClipShapeModifier: ViewModifier {
  enum Shape: String {
    case rectangle, roundedRectangle, circle, capsule, ellipse
  }

  let shape: Shape
  let cornerRadius: CGFloat
  let cornerStyle: RoundedCornerStyle

  init(_ params: [String: Any]) throws {
    shape = try params.requiredEnum("shape")
    cornerRadius = try params.optionalNumber("cornerRadius") ?? 0
    switch try params.optionalString("cornerStyle") {
    case nil, "circular": cornerStyle = .circular
    case "continuous": cornerStyle = .continuous
    default: throw VoltraModifierError.invalidParameter("cornerStyle")
    }
  }

  func body(content: Content) -> some View {
    switch shape {
    case .rectangle:
      content.clipShape(Rectangle())
    case .roundedRectangle:
      content.clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: cornerStyle))
    case .circle:
      content.clipShape(Circle())
    case .capsule:
      content.clipShape(Capsule(style: cornerStyle))
    case .ellipse:
      content.clipShape(Ellipse())
    }
  }
}

struct BlurModifier: ViewModifier {
  let radius: CGFloat
  let opaque: Bool

  func body(content: Content) -> some View {
    content.blur(radius: radius, opaque: opaque)
  }
}

struct ColorAdjustmentModifier: ViewModifier {
  enum Kind {
    case grayscale, saturation, brightness, contrast
  }

  let kind: Kind
  let amount: Double

  func body(content: Content) -> some View {
    switch kind {
    case .grayscale: content.grayscale(amount)
    case .saturation: content.saturation(amount)
    case .brightness: content.brightness(amount)
    case .contrast: content.contrast(amount)
    }
  }
}

enum BlendModeName: String {
  case normal, multiply, screen, overlay, darken, lighten, colorDodge, colorBurn, softLight, hardLight
  case difference, exclusion, hue, saturation, color, luminosity, sourceAtop, destinationOver
  case destinationOut, plusDarker, plusLighter

  var blendMode: BlendMode {
    switch self {
    case .normal: .normal
    case .multiply: .multiply
    case .screen: .screen
    case .overlay: .overlay
    case .darken: .darken
    case .lighten: .lighten
    case .colorDodge: .colorDodge
    case .colorBurn: .colorBurn
    case .softLight: .softLight
    case .hardLight: .hardLight
    case .difference: .difference
    case .exclusion: .exclusion
    case .hue: .hue
    case .saturation: .saturation
    case .color: .color
    case .luminosity: .luminosity
    case .sourceAtop: .sourceAtop
    case .destinationOver: .destinationOver
    case .destinationOut: .destinationOut
    case .plusDarker: .plusDarker
    case .plusLighter: .plusLighter
    }
  }
}

struct BlendModeModifier: ViewModifier {
  let mode: BlendMode

  func body(content: Content) -> some View {
    content.blendMode(mode)
  }
}

// MARK: - Geometry and layout

struct RotationEffectModifier: ViewModifier {
  let degrees: Double

  func body(content: Content) -> some View {
    content.rotationEffect(.degrees(degrees))
  }
}

struct ScaleEffectModifier: ViewModifier {
  let x: CGFloat
  let y: CGFloat

  func body(content: Content) -> some View {
    content.scaleEffect(x: x, y: y)
  }
}

struct OffsetModifier: ViewModifier {
  let x: CGFloat
  let y: CGFloat

  func body(content: Content) -> some View {
    content.offset(x: x, y: y)
  }
}

struct FixedSizeModifier: ViewModifier {
  let horizontal: Bool
  let vertical: Bool

  func body(content: Content) -> some View {
    content.fixedSize(horizontal: horizontal, vertical: vertical)
  }
}

struct LayoutPriorityModifier: ViewModifier {
  let priority: Double

  func body(content: Content) -> some View {
    content.layoutPriority(priority)
  }
}

struct ContainerRelativeFrameModifier: ViewModifier {
  enum Axes: String {
    case horizontal, vertical, both
  }

  let axes: Axes

  func body(content: Content) -> some View {
    if #available(iOS 17.0, macOS 14.0, *) {
      switch axes {
      case .horizontal: content.containerRelativeFrame(.horizontal)
      case .vertical: content.containerRelativeFrame(.vertical)
      case .both: content.containerRelativeFrame([.horizontal, .vertical])
      }
    } else {
      content
    }
  }
}

enum DynamicTypeSizeName: String {
  case xSmall, small, medium, large, xLarge, xxLarge, xxxLarge
  case accessibility1, accessibility2, accessibility3, accessibility4, accessibility5

  var size: DynamicTypeSize {
    switch self {
    case .xSmall: .xSmall
    case .small: .small
    case .medium: .medium
    case .large: .large
    case .xLarge: .xLarge
    case .xxLarge: .xxLarge
    case .xxxLarge: .xxxLarge
    case .accessibility1: .accessibility1
    case .accessibility2: .accessibility2
    case .accessibility3: .accessibility3
    case .accessibility4: .accessibility4
    case .accessibility5: .accessibility5
    }
  }
}

struct DynamicTypeSizeModifier: ViewModifier {
  let size: DynamicTypeSize

  func body(content: Content) -> some View {
    content.dynamicTypeSize(size)
  }
}

// MARK: - Text

struct MinimumScaleFactorModifier: ViewModifier {
  let factor: CGFloat

  func body(content: Content) -> some View {
    content.minimumScaleFactor(factor)
  }
}

enum TruncationModeName: String {
  case head, middle, tail

  var mode: Text.TruncationMode {
    switch self {
    case .head: .head
    case .middle: .middle
    case .tail: .tail
    }
  }
}

struct TruncationModeModifier: ViewModifier {
  let mode: Text.TruncationMode

  func body(content: Content) -> some View {
    content.truncationMode(mode)
  }
}

enum TextAlignmentName: String {
  case leading, center, trailing

  var alignment: TextAlignment {
    switch self {
    case .leading: .leading
    case .center: .center
    case .trailing: .trailing
    }
  }
}

struct MultilineTextAlignmentModifier: ViewModifier {
  let alignment: TextAlignment

  func body(content: Content) -> some View {
    content.multilineTextAlignment(alignment)
  }
}

struct MonospacedDigitModifier: ViewModifier {
  func body(content: Content) -> some View {
    content.monospacedDigit()
  }
}
