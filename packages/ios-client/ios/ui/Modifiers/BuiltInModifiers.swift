import SwiftUI
import WidgetKit

/// The built-in catalog. Each entry mirrors one factory in `packages/ios/src/modifiers`, and the
/// shared fixture test fails when the two sides drift apart.
let builtInModifierDefinitions: [String: VoltraModifierDefinition] = [
  "widgetURL": VoltraModifierDefinition(parameters: ["url"]) { params in
    let string = try params.requiredString("url")
    guard let url = URL(string: string) else { throw VoltraModifierError.invalidParameter("url") }
    return WidgetURLModifier(url: url)
  },
  "privacySensitive": VoltraModifierDefinition(parameters: ["sensitive"]) { params in
    try PrivacySensitiveModifier(sensitive: params.optionalBool("sensitive") ?? true)
  },
  "clipShape": VoltraModifierDefinition(parameters: ["shape", "cornerRadius", "cornerStyle"]) { params in
    try ClipShapeModifier(params)
  },
]

struct WidgetURLModifier: ViewModifier {
  let url: URL

  func body(content: Content) -> some View {
    content.widgetURL(url)
  }
}

struct PrivacySensitiveModifier: ViewModifier {
  let sensitive: Bool

  func body(content: Content) -> some View {
    content.privacySensitive(sensitive)
  }
}

struct ClipShapeModifier: ViewModifier {
  enum Shape: String {
    case rectangle, roundedRectangle, circle, capsule, ellipse
  }

  let shape: Shape
  let cornerRadius: CGFloat
  let cornerStyle: RoundedCornerStyle

  init(_ params: [String: Any]) throws {
    guard let shape = try Shape(rawValue: params.requiredString("shape")) else {
      throw VoltraModifierError.invalidParameter("shape")
    }
    self.shape = shape
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
