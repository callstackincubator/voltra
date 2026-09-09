import Foundation

/// What a `200` body turned out to be.
public enum DynamicWidgetPropsParseResult: Equatable {
  case props(String)
  case invalid(reason: String)
}

/// Reads a server response as Dynamic Widget props.
///
/// The whole point of ADR 0002 is that the server returns data, not UI, so the only thing accepted
/// here is a JSON object. The one shape called out specially is a Voltra payload: `serverUpdate`
/// is the same config key for both engines, so pointing a widget with an `entry` at a payload
/// endpoint is the easy mistake to make, and it has to fail loudly rather than look like unusable
/// props.
public enum DynamicWidgetServerProps {
  public static func parse(_ body: Data) -> DynamicWidgetPropsParseResult {
    guard !body.isEmpty else {
      return .invalid(reason: "response body was empty")
    }

    guard let parsed = try? JSONSerialization.jsonObject(with: body) else {
      return .invalid(reason: "response body is not JSON; a Dynamic Widget's props must be a JSON object")
    }

    guard let object = parsed as? [String: Any] else {
      return .invalid(reason: "response body is not a JSON object; a Dynamic Widget's props must be a JSON object")
    }

    if looksLikeVoltraPayload(object) {
      return .invalid(reason: """
      response body looks like a Voltra payload (top-level 'v' with 'variants' or 'e'). This widget \
      has an entry, so it renders on the device: return the props it should render, not a rendered \
      payload.
      """)
    }

    guard let normalized = try? JSONSerialization.data(withJSONObject: object),
          let json = String(data: normalized, encoding: .utf8)
    else {
      return .invalid(reason: "response body could not be re-encoded as props")
    }

    return .props(json)
  }

  /// A Voltra payload always carries a version under `v` alongside either the size variants a
  /// widget renders or the shared element table. Props that happen to have a `v` key are not
  /// mistaken for one.
  private static func looksLikeVoltraPayload(_ body: [String: Any]) -> Bool {
    guard body["v"] is Int else { return false }

    return body["variants"] is [String: Any] || body["e"] is [Any]
  }
}
