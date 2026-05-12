import Foundation

/// A type-safe representation of JSON values that supports polymorphism
/// and direct decoding without unnecessary serialization roundtrips
public enum JSONValue: Codable, Hashable {
  case null
  case bool(Bool)
  case int(Int)
  case double(Double)
  case string(String)
  case array([JSONValue])
  case object([String: JSONValue])

  /// Parse JSON string into JSONValue
  public static func parse(from jsonString: String) throws -> JSONValue {
    guard let data = jsonString.data(using: .utf8) else {
      throw NSError(domain: "JSONValue", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid UTF-8 string"])
    }
    return try JSONDecoder().decode(JSONValue.self, from: data)
  }

  /// Convenience accessors
  public var stringValue: String? {
    guard case let .string(value) = self else { return nil }
    return value
  }

  public var intValue: Int? {
    guard case let .int(value) = self else { return nil }
    return value
  }

  public var doubleValue: Double? {
    guard case let .double(value) = self else { return nil }
    return value
  }

  public var boolValue: Bool? {
    guard case let .bool(value) = self else { return nil }
    return value
  }

  public var arrayValue: [JSONValue]? {
    guard case let .array(value) = self else { return nil }
    return value
  }

  public var objectValue: [String: JSONValue]? {
    guard case let .object(value) = self else { return nil }
    return value
  }

  /// Access object properties by key
  public subscript(key: String) -> JSONValue? {
    guard case let .object(dict) = self else { return nil }
    return dict[key]
  }

  /// Convert to Any for legacy compatibility
  public func toAny() -> Any {
    switch self {
    case .null:
      return NSNull()
    case let .bool(value):
      return value
    case let .int(value):
      return value
    case let .double(value):
      return value
    case let .string(value):
      return value
    case let .array(value):
      return value.map { $0.toAny() }
    case let .object(value):
      return value.mapValues { $0.toAny() }
    }
  }
}

// MARK: - Codable

public extension JSONValue {
  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()

    if container.decodeNil() {
      self = .null
    } else if let bool = try? container.decode(Bool.self) {
      self = .bool(bool)
    } else if let int = try? container.decode(Int.self) {
      self = .int(int)
    } else if let double = try? container.decode(Double.self) {
      self = .double(double)
    } else if let string = try? container.decode(String.self) {
      self = .string(string)
    } else if let array = try? container.decode([JSONValue].self) {
      self = .array(array)
    } else if let object = try? container.decode([String: JSONValue].self) {
      self = .object(object)
    } else {
      throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "JSONValue cannot decode this value"
      )
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()

    switch self {
    case .null:
      try container.encodeNil()
    case let .bool(value):
      try container.encode(value)
    case let .int(value):
      try container.encode(value)
    case let .double(value):
      try container.encode(value)
    case let .string(value):
      try container.encode(value)
    case let .array(value):
      try container.encode(value)
    case let .object(value):
      try container.encode(value)
    }
  }
}
