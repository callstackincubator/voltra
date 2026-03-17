import SwiftUI

enum RadialGradientShape {
  case circle
  case ellipse
}

enum RadialGradientExtent {
  case closestSide
  case farthestSide
  case closestCorner
  case farthestCorner
}

struct RadialGradientSpec {
  var gradient: Gradient
  var center: UnitPoint
  var shape: RadialGradientShape
  var extent: RadialGradientExtent
}

enum BackgroundValue {
  case color(Color)
  case linearGradient(gradient: Gradient, startPoint: UnitPoint, endPoint: UnitPoint)
  case radialGradient(spec: RadialGradientSpec)
  case angularGradient(gradient: Gradient, center: UnitPoint, angle: Angle)
}
