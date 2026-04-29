import Foundation

public indirect enum ResolvableJSONValue: Hashable {
  case literal(JSONValue)
  case array([ResolvableJSONValue])
  case object([String: ResolvableJSONValue])
  case expression(ResolvableExpression)
}

public indirect enum ResolvableExpression: Hashable {
  case env(ResolvableEnvironmentID)
  case when(condition: ResolvableCondition, thenValue: ResolvableJSONValue, elseValue: ResolvableJSONValue)
  case match(value: ResolvableJSONValue, cases: [String: ResolvableJSONValue])
}

public indirect enum ResolvableCondition: Hashable {
  case eq(ResolvableJSONValue, ResolvableJSONValue)
  case ne(ResolvableJSONValue, ResolvableJSONValue)
  case and([ResolvableCondition])
  case or([ResolvableCondition])
  case not(ResolvableCondition)
  case inList(ResolvableJSONValue, [ResolvableJSONValue])
}

enum ResolvableError: Error, LocalizedError {
  case invalidWrappedValue(JSONValue)
  case invalidTuple(JSONValue)
  case invalidObjectShape(JSONValue)
  case invalidOpcode(Int)
  case invalidEnvironmentID(Int)
  case missingDefaultCase
  case invalidConditionTuple(JSONValue)

  var errorDescription: String? {
    switch self {
    case let .invalidWrappedValue(value):
      return "Invalid wrapped resolvable value: \(value)"
    case let .invalidTuple(value):
      return "Invalid resolvable tuple: \(value)"
    case let .invalidObjectShape(value):
      return "Invalid resolvable object shape: \(value)"
    case let .invalidOpcode(opcode):
      return "Unknown resolvable opcode: \(opcode)"
    case let .invalidEnvironmentID(id):
      return "Unknown resolvable environment id: \(id)"
    case .missingDefaultCase:
      return "Resolvable match expression is missing a default case"
    case let .invalidConditionTuple(value):
      return "Invalid resolvable condition tuple: \(value)"
    }
  }
}
