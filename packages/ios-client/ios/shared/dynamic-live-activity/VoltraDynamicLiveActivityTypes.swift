import Foundation

#if os(iOS)
  import ActivityKit
#endif

/// The JSON-compatible value type used by Dynamic Live Activity props.
///
/// This deliberately models only values that can cross the ActivityKit and
/// JavaScript boundaries without a definition-specific schema.
public indirect enum VoltraDynamicLiveActivityJSONValue: Codable, Hashable {
  case null
  case bool(Bool)
  case number(Double)
  case string(String)
  case array([VoltraDynamicLiveActivityJSONValue])
  case object([String: VoltraDynamicLiveActivityJSONValue])

  public init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if container.decodeNil() {
      self = .null
    } else if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else if let value = try? container.decode(String.self) {
      self = .string(value)
    } else if let value = try? container.decode([VoltraDynamicLiveActivityJSONValue].self) {
      self = .array(value)
    } else if let value = try? container.decode([String: VoltraDynamicLiveActivityJSONValue].self) {
      self = .object(value)
    } else {
      throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "Expected a JSON-compatible value"
      )
    }
  }

  public func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .null:
      try container.encodeNil()
    case let .bool(value):
      try container.encode(value)
    case let .number(value):
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

/// The generic state shared by every generated Dynamic Live Activity type.
/// Every ActivityKit update replaces the complete props record.
public struct VoltraDynamicLiveActivityContentState: Codable, Hashable {
  public let props: [String: VoltraDynamicLiveActivityJSONValue]

  public init(props: [String: VoltraDynamicLiveActivityJSONValue]) {
    self.props = props
  }
}

public enum VoltraDynamicLiveActivityError: Error {
  case unknownDefinition(String)
  case payloadTooLarge(size: Int)
  case rendererMismatch
  case resourceUnavailable(Error)
}

// ActivityKit is unavailable to the macOS SwiftPM test target. The JSON props
// contract above remains independently testable there.
#if os(iOS)
  /// Metadata and static attributes supplied by each generated definition.
  public protocol VoltraDynamicLiveActivityDefinition: ActivityAttributes where ContentState == VoltraDynamicLiveActivityContentState {
    static var definitionId: String { get }
    var name: String { get }
    var deepLinkUrl: String? { get }
    init(name: String, deepLinkUrl: String?)
  }
#endif
