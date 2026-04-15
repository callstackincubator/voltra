import SwiftUI

public struct VoltraControlIf: VoltraView {
  public typealias Parameters = EmptyParameters

  public let element: VoltraElement

  public init(_ element: VoltraElement) {
    self.element = element
  }

  public var body: some View {
    if evaluateCondition() {
      element.children ?? .empty
    } else {
      element.rawComponentProp("else")
    }
  }

  private func evaluateCondition() -> Bool {
    guard let conditionJSON = element.rawPropJSON("condition"),
          let condition = try? ResolvableValueParser.parseCondition(conditionJSON)
    else {
      return false
    }
    return ResolvableValueEvaluator.evaluate(condition, environment: element.resolvableEnvironment)
  }
}
