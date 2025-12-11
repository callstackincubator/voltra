import Foundation

/// Any Codable supports different `Codable` types as `String`, `Int`, `Data`, `Double` and `Bool`.
/// This is made so you can use `AnyCodable?` in a codable struct so you can use dynamic types.
///
/// Example:
/// ```swift
/// struct WithAnyCodable: Codable, Hashable {
///   let someOptionalString: String?
///   let someOptionalCodable: AnyCodable?
/// }
/// ```
public enum AnyCodable {
    /// String value
    case string(String)

    /// Integer value
    case int(Int)

    /// Data value
    case data(Data)

    /// Double value
    case double(Double)

    /// Boolean value
    case bool(Bool)

    /// Array value
    case array([AnyCodable])

    /// No value
    case none

    /// Missing value error
    enum AnyCodableError: Error {
        /// Missing value
        case missingValue
    }
}

extension AnyCodable {
    /// Convert value to String
    /// - Returns: value if it is a String
    public func toString() -> String? {
        if case let .string(string) = self {
            return string
        }

        return nil
    }

    /// Convert value to Int
    /// - Returns: value if it is a Integer
    public func toInt() -> Int? {
        if case let .int(int) = self {
            return int
        }

        return nil
    }

    /// Convert value to Data
    /// - Returns: value if it is data
    public func toData() -> Data? {
        if case let .data(data) = self {
            return data
        }

        return nil
    }

    /// Convert value to Double
    /// - Returns: value if it can be represented as a double
    public func toDouble() -> Double? {
        switch self {
        case let .double(double):
            return double
        case let .int(int):
            return Double(int)
        case let .string(string):
            return Double(string)
        default:
            return nil
        }
    }

    /// Convert value to Bool
    /// - Returns: value if it is a boolean
    public func toBool() -> Bool? {
        if case let .bool(bool) = self {
            return bool
        }

        return nil
    }

    /// Convert value to Array
    /// - Returns: value if it is an array
    public func toArray() -> [AnyCodable]? {
        if case let .array(array) = self {
            return array
        }

        return nil
    }

    /// Check if value is nil
    /// - Returns: nil if value is none/empty
    public func isNil() -> Bool {
        if case .none = self {
            return true
        }

        return false
    }
    
    /// Convert AnyCodable to its underlying value as Any
    /// Used for JSON serialization
    /// - Returns: The underlying value (String, Int, Double, Bool, Data, or NSNull)
    public func toAny() -> Any {
        switch self {
        case .string(let value):
            return value
        case .int(let value):
            return value
        case .double(let value):
            return value
        case .bool(let value):
            return value
        case .data(let value):
            return value
        case .array(let value):
            return value.map { $0.toAny() }
        case .none:
            return NSNull()
        }
    }
}

extension AnyCodable: Codable, Hashable {
    enum CodingKeys: String, CodingKey {
        case string, int, data, double, bool, array
    }

    /// Decode the values
    /// 
    /// - Parameter decoder: 
    public init(from decoder: Decoder) throws {
        if let int = try? decoder.singleValueContainer().decode(Int.self) {
            self = .int(int)
            return
        }

        if let string = try? decoder.singleValueContainer().decode(String.self) {
            self = .string(string)
            return
        }

        if let data = try? decoder.singleValueContainer().decode(Data.self) {
            self = .data(data)
            return
        }

        if let double = try? decoder.singleValueContainer().decode(Double.self) {
            self = .double(double)
            return
        }

        if let bool = try? decoder.singleValueContainer().decode(Bool.self) {
            self = .bool(bool)
            return
        }

        if let array = try? decoder.singleValueContainer().decode([AnyCodable].self) {
            self = .array(array)
            return
        }

        // Use `self = .none` if the value can be optional
        // or `throw AnyCodableError.missingValue` is it may not be optional
        self = .none
    }

    /// Encode the values
    ///
    /// - Parameter encoder: Encoder
    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch self {
        case .string(let value):
            try container.encode(value)

        case .int(let value):
            try container.encode(value)

        case .data(let value):
            try container.encode(value)

        case .double(let value):
            try container.encode(value)

        case .bool(let value):
            try container.encode(value)

        case .array(let value):
            try container.encode(value)

        case .none:
            try container.encodeNil()
        }
    }
}
