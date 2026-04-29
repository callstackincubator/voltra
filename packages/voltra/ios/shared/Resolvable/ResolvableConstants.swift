import Foundation

enum ResolvableWireKey {
  static let sentinel = "$rv"
  static let defaultCase = "default"
}

enum ResolvableValueOpcode: Int {
  case env = 0
  case when = 1
  case match = 2
}

enum ResolvableConditionOpcode: Int {
  case eq = 0
  case ne = 1
  case and = 2
  case or = 3
  case not = 4
  case inList = 5
}

public enum ResolvableEnvironmentID: Int {
  case renderingMode = 0
  case showsWidgetContainerBackground = 1
  case primary = 2
  case onPrimary = 3
  case primaryContainer = 4
  case onPrimaryContainer = 5
  case secondary = 6
  case onSecondary = 7
  case secondaryContainer = 8
  case onSecondaryContainer = 9
  case tertiary = 10
  case onTertiary = 11
  case tertiaryContainer = 12
  case onTertiaryContainer = 13
  case error = 14
  case errorContainer = 15
  case onError = 16
  case onErrorContainer = 17
  case background = 18
  case onBackground = 19
  case surface = 20
  case onSurface = 21
  case surfaceVariant = 22
  case onSurfaceVariant = 23
  case outline = 24
  case inverseOnSurface = 25
  case inverseSurface = 26
  case inversePrimary = 27
  case widgetBackground = 28
}
