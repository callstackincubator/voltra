import Foundation
import os

public enum ResolvableValueEvaluator {
  public static func resolve(_ value: JSONValue, environment: ResolvableEnvironment) -> JSONValue {
    do {
      let parsed = try ResolvableValueParser.parse(value)
      return evaluate(parsed, environment: environment)
    } catch {
      logWarning(error)
      return .null
    }
  }

  public static func evaluate(_ value: ResolvableJSONValue, environment: ResolvableEnvironment) -> JSONValue {
    switch value {
    case let .literal(literal):
      return literal
    case let .array(items):
      return .array(items.map { evaluate($0, environment: environment) })
    case let .object(object):
      return .object(object.mapValues { evaluate($0, environment: environment) })
    case let .expression(expression):
      return evaluate(expression, environment: environment)
    }
  }

  static func evaluate(_ expression: ResolvableExpression, environment: ResolvableEnvironment) -> JSONValue {
    switch expression {
    case let .env(id):
      return environment.value(for: id) ?? .null
    case let .when(condition, thenValue, elseValue):
      return evaluate(condition, environment: environment)
        ? evaluate(thenValue, environment: environment)
        : evaluate(elseValue, environment: environment)
    case let .match(value, cases):
      let resolvedValue = evaluate(value, environment: environment)
      let key = matchCaseKey(for: resolvedValue)
      let branch = cases[key] ?? cases[ResolvableWireKey.defaultCase]
      guard let branch else {
        logWarning(ResolvableError.missingDefaultCase)
        return .null
      }
      return evaluate(branch, environment: environment)
    }
  }

  static func evaluate(_ condition: ResolvableCondition, environment: ResolvableEnvironment) -> Bool {
    switch condition {
    case let .eq(left, right):
      return evaluate(left, environment: environment) == evaluate(right, environment: environment)
    case let .ne(left, right):
      return evaluate(left, environment: environment) != evaluate(right, environment: environment)
    case let .and(conditions):
      return conditions.allSatisfy { evaluate($0, environment: environment) }
    case let .or(conditions):
      return conditions.contains { evaluate($0, environment: environment) }
    case let .not(condition):
      return !evaluate(condition, environment: environment)
    case let .inList(value, values):
      let resolvedValue = evaluate(value, environment: environment)
      return values.contains { evaluate($0, environment: environment) == resolvedValue }
    }
  }

  private static func matchCaseKey(for value: JSONValue) -> String {
    switch value {
    case .null:
      return "null"
    case let .bool(boolValue):
      return boolValue ? "true" : "false"
    case let .int(intValue):
      return String(intValue)
    case let .double(doubleValue):
      if doubleValue.isFinite, doubleValue.rounded(.towardZero) == doubleValue {
        return String(Int(doubleValue))
      }
      return String(doubleValue)
    case let .string(stringValue):
      return stringValue
    case let .array(arrayValue):
      return String(describing: arrayValue)
    case let .object(objectValue):
      return String(describing: objectValue)
    }
  }

  private static func logWarning(_ error: Error) {
    Logger(subsystem: "com.voltra", category: "resolvable")
      .warning("Failed to resolve value: \(error.localizedDescription, privacy: .public)")
  }
}
