import Foundation

/// Why a Dynamic Widget could not be drawn, and where in the pipeline it went wrong.
///
/// ADR 0013: a render used to collapse every failure into `nil` and fall through to the
/// prerendered placeholder. This keeps the reason, so the widget can say it in a dev build and the
/// log can say it in every build.
public struct DynamicWidgetRenderFailure: Error, Equatable {
  public enum Stage: String, Equatable {
    /// Loading the bundle from Metro or the baked asset.
    case bundle
    /// Evaluating the bundle in the JSContext.
    case evaluate
    /// Calling `render(props, env)`.
    case render
    /// Turning the string `render()` returned into a node.
    case parse
  }

  public let stage: Stage
  public let message: String
  /// The JS stack, when the failure came from a JS exception. Release bundles are minified, so it
  /// is only useful (and only shown) in dev.
  public let stack: String?

  public init(stage: Stage, message: String, stack: String? = nil) {
    self.stage = stage
    self.message = message
    self.stack = stack
  }
}

/// What rendering one placement produced: the resolved node JSON, or the reason it failed.
public typealias DynamicWidgetRenderOutcome = Result<String, DynamicWidgetRenderFailure>

/// The messages for bundle-stage failures, so they read the same wherever they are raised.
public enum DynamicWidgetBundleFailureMessage {
  static let maxBodyLength = 512

  public static func metroUnreachable(host: String, cause: String) -> String {
    "Metro unreachable at \(host): \(cause)"
  }

  /// `body` is Metro's response. Its JSON `error` (or `message`) field is what says why, so that is
  /// used when present, else the raw text. Truncated: Metro's error bodies can be a whole stack.
  public static func metroHTTP(code: Int, url: String, body: Data?) -> String {
    var message = "Metro HTTP \(code) for \(url)"
    if let detail = metroErrorDetail(body) {
      message += ": \(detail)"
    }
    return message
  }

  public static func missingBakedAsset(path: String) -> String {
    "Baked bundle missing from the widget extension: \(path)"
  }

  private static func metroErrorDetail(_ body: Data?) -> String? {
    guard let body, !body.isEmpty else { return nil }
    var text: String?
    if let object = try? JSONSerialization.jsonObject(with: body) as? [String: Any] {
      text = (object["error"] as? String) ?? (object["message"] as? String)
    }
    if text == nil {
      text = String(data: body, encoding: .utf8)
    }
    guard let trimmed = text?.trimmingCharacters(in: .whitespacesAndNewlines), !trimmed.isEmpty else {
      return nil
    }
    return String(trimmed.prefix(maxBodyLength))
  }
}
