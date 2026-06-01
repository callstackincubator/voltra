import Foundation
import JavaScriptCore

/// Runs the ios-renderer bundle inside a JavaScriptCore context to resolve AppIntent
/// template expressions in a Voltra payload before the existing Swift interpreter renders
/// the result.
///
/// The JSContext is initialised lazily and cached for the process lifetime so the bundle
/// is only evaluated once per extension process.
public enum VoltraJSRenderer {
  private static var _context: JSContext?
  private static let lock = NSLock()

  // MARK: - Public API

  /// Resolves AppIntent template expressions in a raw JSON payload string and returns the
  /// resolved JSON string, or nil if the bundle is missing or the JS engine fails.
  ///
  /// On nil the caller should fall back to the original payload — the existing interpreter
  /// handles it correctly, it just won't substitute AppIntent values.
  public static func resolve(
    payloadJSON: String,
    appIntentParams: [String: String]
  ) -> String? {
    guard let ctx = context else { return nil }

    guard let data = payloadJSON.data(using: .utf8),
          let payloadObj = try? JSONSerialization.jsonObject(with: data)
    else {
      VoltraLogger.widget.error("[VoltraJSRenderer] Failed to parse payload JSON")
      return nil
    }

    guard let renderer = ctx.objectForKeyedSubscript("VoltraRenderer"),
          let resolveFn = renderer.objectForKeyedSubscript("resolve"),
          !resolveFn.isUndefined
    else {
      VoltraLogger.widget.error("[VoltraJSRenderer] VoltraRenderer.resolve not found in context")
      return nil
    }

    let result = resolveFn.call(withArguments: [payloadObj, appIntentParams as NSDictionary])

    guard let result,
          !result.isNull,
          !result.isUndefined,
          let resultObj = result.toObject(),
          JSONSerialization.isValidJSONObject(resultObj),
          let resultData = try? JSONSerialization.data(withJSONObject: resultObj),
          let resultJSON = String(data: resultData, encoding: .utf8)
    else {
      VoltraLogger.widget.error("[VoltraJSRenderer] Failed to serialise resolved payload")
      return nil
    }

    return resultJSON
  }

  // MARK: - Context lifecycle

  private static var context: JSContext? {
    lock.lock()
    defer { lock.unlock() }

    if let existing = _context { return existing }

    guard let bundleURL = Bundle.main.url(forResource: "ios-renderer", withExtension: "js"),
          let source = try? String(contentsOf: bundleURL, encoding: .utf8)
    else {
      VoltraLogger.widget.error("[VoltraJSRenderer] ios-renderer.js not found in extension bundle — rebuild the ios-renderer package")
      return nil
    }

    let ctx = JSContext()!
    ctx.exceptionHandler = { _, exception in
      VoltraLogger.widget.error("[VoltraJSRenderer] JS exception: \(exception?.toString() ?? "unknown")")
    }
    ctx.evaluateScript(source)
    _context = ctx

    VoltraLogger.widget.info("[VoltraJSRenderer] JSContext initialised")
    return ctx
  }
}
