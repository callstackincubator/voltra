import Foundation

public enum ResolvableValueParser {
  public static func parse(_ value: JSONValue) throws -> ResolvableJSONValue {
    switch value {
    case .null, .bool, .int, .double, .string:
      return .literal(value)
    case let .array(items):
      return .array(try items.map(parse))
    case let .object(object):
      if object.keys.contains(ResolvableWireKey.sentinel) {
        return .expression(try parseWrappedExpression(object))
      }

      var parsed: [String: ResolvableJSONValue] = [:]
      for (key, nestedValue) in object {
        parsed[key] = try parse(nestedValue)
      }
      return .object(parsed)
    }
  }

  private static func parseWrappedExpression(_ object: [String: JSONValue]) throws -> ResolvableExpression {
    guard object.count == 1, let tupleValue = object[ResolvableWireKey.sentinel] else {
      throw ResolvableError.invalidWrappedValue(.object(object))
    }

    guard case let .array(tuple) = tupleValue, let opcodeValue = tuple.first?.intValue else {
      throw ResolvableError.invalidTuple(tupleValue)
    }

    guard let opcode = ResolvableValueOpcode(rawValue: opcodeValue) else {
      throw ResolvableError.invalidOpcode(opcodeValue)
    }

    switch opcode {
    case .env:
      guard tuple.count == 2, let environmentIDValue = tuple[1].intValue else {
        throw ResolvableError.invalidTuple(tupleValue)
      }
      guard let environmentID = ResolvableEnvironmentID(rawValue: environmentIDValue) else {
        throw ResolvableError.invalidEnvironmentID(environmentIDValue)
      }
      return .env(environmentID)
    case .when:
      guard tuple.count == 4 else {
        throw ResolvableError.invalidTuple(tupleValue)
      }
      return .when(
        condition: try parseCondition(tuple[1]),
        thenValue: try parse(tuple[2]),
        elseValue: try parse(tuple[3])
      )
    case .match:
      guard tuple.count == 3 else {
        throw ResolvableError.invalidTuple(tupleValue)
      }
      guard case let .object(casesValue) = tuple[2] else {
        throw ResolvableError.invalidObjectShape(tuple[2])
      }

      var parsedCases: [String: ResolvableJSONValue] = [:]
      for (key, caseValue) in casesValue {
        parsedCases[key] = try parse(caseValue)
      }

      guard parsedCases[ResolvableWireKey.defaultCase] != nil else {
        throw ResolvableError.missingDefaultCase
      }

      return .match(value: try parse(tuple[1]), cases: parsedCases)
    }
  }

  private static func parseCondition(_ value: JSONValue) throws -> ResolvableCondition {
    guard case let .array(tuple) = value, let opcodeValue = tuple.first?.intValue else {
      throw ResolvableError.invalidConditionTuple(value)
    }

    guard let opcode = ResolvableConditionOpcode(rawValue: opcodeValue) else {
      throw ResolvableError.invalidOpcode(opcodeValue)
    }

    switch opcode {
    case .eq:
      guard tuple.count == 3 else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .eq(try parse(tuple[1]), try parse(tuple[2]))
    case .ne:
      guard tuple.count == 3 else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .ne(try parse(tuple[1]), try parse(tuple[2]))
    case .and:
      guard tuple.count == 2, case let .array(items) = tuple[1] else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .and(try items.map(parseCondition))
    case .or:
      guard tuple.count == 2, case let .array(items) = tuple[1] else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .or(try items.map(parseCondition))
    case .not:
      guard tuple.count == 2 else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .not(try parseCondition(tuple[1]))
    case .inList:
      guard tuple.count == 3, case let .array(items) = tuple[2] else {
        throw ResolvableError.invalidConditionTuple(value)
      }
      return .inList(try parse(tuple[1]), try items.map(parse))
    }
  }
}
