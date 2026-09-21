import Foundation

enum DynamicLiveActivityPropsCodec {
  static func encode(_ props: [String: VoltraDynamicLiveActivityJSONValue]) -> String? {
    guard
      let data = try? JSONEncoder().encode(props),
      let json = String(data: data, encoding: .utf8)
    else {
      return nil
    }
    return json
  }
}
