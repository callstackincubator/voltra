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
}
