import SwiftUI

struct DecorationStyle {
  var backgroundColor: BackgroundValue?
  var cornerRadius: CGFloat?
  var border: (width: CGFloat, color: Color)?
  var shadow: (radius: CGFloat, color: Color, opacity: Double, offset: CGSize)?
  var glassEffect: GlassEffect?
  var overflow: Overflow?
}

struct DecorationModifier: ViewModifier {
  let style: DecorationStyle

  private func point(from unitPoint: UnitPoint, in size: CGSize) -> CGPoint {
    CGPoint(x: unitPoint.x * size.width, y: unitPoint.y * size.height)
  }

  private func distance(_ a: CGPoint, _ b: CGPoint) -> CGFloat {
    hypot(a.x - b.x, a.y - b.y)
  }

  private func radialRadii(spec: RadialGradientSpec, in size: CGSize) -> (x: CGFloat, y: CGFloat) {
    let center = point(from: spec.center, in: size)
    let left = center.x
    let right = size.width - center.x
    let top = center.y
    let bottom = size.height - center.y

    let horizontalClosest = min(left, right)
    let horizontalFarthest = max(left, right)
    let verticalClosest = min(top, bottom)
    let verticalFarthest = max(top, bottom)

    let corners = [
      CGPoint(x: 0, y: 0),
      CGPoint(x: size.width, y: 0),
      CGPoint(x: 0, y: size.height),
      CGPoint(x: size.width, y: size.height),
    ]
    let cornerDistances = corners.map { distance(center, $0) }
    let closestCorner = cornerDistances.min() ?? 0
    let farthestCorner = cornerDistances.max() ?? 0

    switch spec.shape {
    case .circle:
      let radius: CGFloat
      switch spec.extent {
      case .closestSide: radius = min(horizontalClosest, verticalClosest)
      case .farthestSide: radius = max(horizontalFarthest, verticalFarthest)
      case .closestCorner: radius = closestCorner
      case .farthestCorner: radius = farthestCorner
      }
      return (max(0, radius), max(0, radius))
    case .ellipse:
      switch spec.extent {
      case .closestSide:
        return (max(0, horizontalClosest), max(0, verticalClosest))
      case .farthestSide:
        return (max(0, horizontalFarthest), max(0, verticalFarthest))
      case .closestCorner, .farthestCorner:
        let target = spec.extent == .closestCorner ? closestCorner : farthestCorner
        let referenceCorner = corners.max {
          let lhs = distance(center, $0)
          let rhs = distance(center, $1)
          if spec.extent == .closestCorner {
            return lhs > rhs
          }
          return lhs < rhs
        } ?? CGPoint(x: size.width, y: size.height)

        let dx = abs(referenceCorner.x - center.x)
        let dy = abs(referenceCorner.y - center.y)
        if dy == 0 {
          return (max(0, target), max(0, target))
        }
        let aspect = size.width / max(size.height, 1)
        let ry = sqrt((dx * dx) / max(aspect * aspect, 0.0001) + dy * dy)
        if ry == 0 {
          return (max(0, target), max(0, target))
        }
        let scale = target / ry
        return (max(0, aspect * ry * scale), max(0, ry * scale))
      }
    }
  }

  @ViewBuilder
  private func radialGradientBackground(_ spec: RadialGradientSpec) -> some View {
    GeometryReader { proxy in
      let size = proxy.size
      let radii = radialRadii(spec: spec, in: size)
      let baseRadius = max(max(radii.x, radii.y), 0.0001)
      let circle = RadialGradient(gradient: spec.gradient, center: spec.center, startRadius: 0, endRadius: baseRadius)
      if spec.shape == .ellipse {
        circle
          .scaleEffect(
            x: radii.x / baseRadius,
            y: radii.y / baseRadius,
            anchor: spec.center
          )
      } else {
        circle
      }
    }
    .allowsHitTesting(false)
  }

  func body(content: Content) -> some View {
    content
      .voltraIfLet(style.backgroundColor) { content, bg in
        switch bg {
        case let .color(color):
          content.background(color)
        case let .linearGradient(gradient, start, end):
          content.background(LinearGradient(gradient: gradient, startPoint: start, endPoint: end))
        case let .radialGradient(spec):
          content.background {
            radialGradientBackground(spec)
          }
        case let .angularGradient(gradient, center, angle):
          content.background(AngularGradient(gradient: gradient, center: center, angle: angle))
        }
      }
      // If we have a corner radius, we must handle the border specifically here
      .voltraIfLet(style.cornerRadius) { content, radius in
        if let border = style.border {
          content
            .cornerRadius(radius)
            .overlay(
              RoundedRectangle(cornerRadius: radius)
                .stroke(border.color, lineWidth: border.width)
            )
        } else {
          content.cornerRadius(radius)
        }
      }
      // Fallback: If there is NO corner radius, but there IS a border
      .voltraIf(style.cornerRadius == nil && style.border != nil) { content in
        content.border(style.border!.color, width: style.border!.width)
      }
      .voltraIf(style.overflow == .hidden) { view in
        view.clipped()
      }
      .voltraIfLet(style.shadow) { content, shadow in
        content
          .compositingGroup()
          .shadow(
            color: shadow.color.opacity(shadow.opacity),
            radius: shadow.radius,
            x: shadow.offset.width,
            y: shadow.offset.height
          )
      }
      .voltraIfLet(style.glassEffect) { content, glassEffect in
        if #available(iOS 26.0, *) {
          switch glassEffect {
          case .clear:
            content.glassEffect(.clear)
          case .identity:
            content.glassEffect(.identity)
          case .regular:
            content.glassEffect(.regular)
          case .none:
            content
          }
        } else {
          content
        }
      }
  }
}
