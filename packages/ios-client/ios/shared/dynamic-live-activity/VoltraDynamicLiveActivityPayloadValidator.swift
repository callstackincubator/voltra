import Foundation

/// Checks the portion of a Dynamic Live Activity payload ActivityKit stores.
/// This is intentionally uncompressed: ActivityKit's 4 KB limit applies to its
/// encoded attributes and content state, not Voltra's legacy rendered payload.
public enum VoltraDynamicLiveActivityPayloadValidator {
  private struct Payload: Encodable {
    let attributes: Attributes
    let contentState: VoltraDynamicLiveActivityContentState

    enum CodingKeys: String, CodingKey {
      case attributes
      case contentState = "content-state"
    }
  }

  private struct Attributes: Encodable {
    let name: String
    let deepLinkUrl: String?
  }

  public static func decodeProps(_ jsonString: String) throws -> [String: VoltraDynamicLiveActivityJSONValue] {
    let data = Data(jsonString.utf8)
    return try JSONDecoder().decode([String: VoltraDynamicLiveActivityJSONValue].self, from: data)
  }

  public static func validate(
    name: String,
    deepLinkUrl: String?,
    props: [String: VoltraDynamicLiveActivityJSONValue]
  ) throws {
    let payload = Payload(
      attributes: Attributes(name: name, deepLinkUrl: deepLinkUrl),
      contentState: VoltraDynamicLiveActivityContentState(props: props)
    )
    try validateEncoded(payload)
  }

  public static func validateContentState(_ props: [String: VoltraDynamicLiveActivityJSONValue]) throws {
    try validateEncoded(VoltraDynamicLiveActivityContentState(props: props))
  }

  private static func validateEncoded(_ value: some Encodable) throws {
    let size = try JSONEncoder().encode(value).count
    guard size <= VoltraConstants.maxPayloadSizeBytes else {
      throw VoltraDynamicLiveActivityError.payloadTooLarge(size: size)
    }
  }
}
