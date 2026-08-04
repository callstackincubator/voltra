import Foundation

/// Checks the portion of a Dynamic Live Activity payload ActivityKit stores.
/// This is intentionally uncompressed: ActivityKit's 4 KB limit applies to its
/// encoded attributes and content state, not Voltra's legacy rendered payload.
public enum VoltraDynamicLiveActivityPayloadValidator {
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
    let attributesSize = try encodedSize(Attributes(name: name, deepLinkUrl: deepLinkUrl))
    let contentStateSize = try encodedSize(VoltraDynamicLiveActivityContentState(props: props))
    try validateSize(attributesSize + contentStateSize)
  }

  public static func validateContentState(_ props: [String: VoltraDynamicLiveActivityJSONValue]) throws {
    try validateSize(encodedSize(VoltraDynamicLiveActivityContentState(props: props)))
  }

  public static func encodedContentStateSize(
    _ props: [String: VoltraDynamicLiveActivityJSONValue]
  ) throws -> Int {
    try encodedSize(VoltraDynamicLiveActivityContentState(props: props))
  }

  public static func encodedStartSize(
    name: String,
    deepLinkUrl: String?,
    props: [String: VoltraDynamicLiveActivityJSONValue]
  ) throws -> Int {
    try encodedSize(Attributes(name: name, deepLinkUrl: deepLinkUrl)) +
      encodedSize(VoltraDynamicLiveActivityContentState(props: props))
  }

  private static func encodedSize(_ value: some Encodable) throws -> Int {
    try JSONEncoder().encode(value).count
  }

  private static func validateSize(_ size: Int) throws {
    guard size <= VoltraConstants.maxPayloadSizeBytes else {
      throw VoltraDynamicLiveActivityError.payloadTooLarge(size: size)
    }
  }
}
