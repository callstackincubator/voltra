import Foundation
import JavaScriptCore

/// JavaScriptCore-backed runtime for Voltra **client-rendered widgets** (Track 5).
///
/// Each widget ships its own Metro bundle that defines `module.exports.render(props, env)`
/// (see `example/metro/widgetRegistry.js`). When evaluated, the bundle ends with `__r(0)`
/// which executes its entry module; we wrap the bundle source with a small bootstrap that
/// captures those exports into `globalThis.__voltraWidgets[<widgetId>]` so we can call
/// `render` from native at any later moment.
///
/// One shared `JSContext` per process — per Q9 in the design grilling. Each subsequent
/// bundle evaluation overwrites Metro's `__r`/`__d` globals (they're closure-scoped per
/// bundle's IIFE), but the captured `globalThis.__voltraWidgets[<widgetId>]` reference
/// retains each widget's render function indefinitely.
///
/// **Phase 3a** scope: this is the runtime smoke test surface. Bundles are loaded as
/// strings via [evaluateBundle] (called from JS via the TurboModule for now). Phase 3b
/// adds Swift-side bundle loading from Metro URL / assets, env capture, and the
/// WidgetKit hook-up.
public enum VoltraJSRenderer {
  private static var _context: JSContext?
  private static let lock = NSLock()
  private static let TAG = "VoltraJSRenderer"

  // MARK: - Public API

  /// Evaluate a Voltra widget bundle in the shared JSContext, capturing the bundle's
  /// `render(props, env)` export under `globalThis.__voltraWidgets[<widgetId>]`.
  ///
  /// The bundle source is the raw output of Metro's
  /// `/voltra/widgets/<widgetId>.bundle` endpoint. We append a small bootstrap line
  /// that runs after the bundle's `__r(0)` to capture the entry module's exports.
  ///
  /// Idempotent: re-evaluating the same widget overwrites the captured exports — used
  /// by dev-mode hot-reload (always-refetch policy).
  public static func evaluateBundle(source: String, widgetId: String) -> Bool {
    lock.lock()
    defer { lock.unlock() }

    guard let ctx = context() else {
      VoltraLogger.widget.error("[\(TAG)] No JSContext available")
      return false
    }

    let escapedId = jsStringLiteral(widgetId)
    let wrapped = """
    \(source)
    ;(function () {
      if (!globalThis.__voltraWidgets) { globalThis.__voltraWidgets = {}; }
      globalThis.__voltraWidgets[\(escapedId)] = __r(0);
    })();
    """

    ctx.exception = nil
    ctx.evaluateScript(wrapped)
    if let message = exceptionMessage(ctx) {
      VoltraLogger.widget.error("[\(TAG)] Bundle eval failed for widgetId=\(widgetId): \(message)")
      return false
    }

    // Verify the bootstrap captured the exports correctly
    guard
      let registry = ctx.objectForKeyedSubscript("__voltraWidgets"),
      !registry.isUndefined,
      let widget = registry.objectForKeyedSubscript(widgetId),
      !widget.isUndefined,
      let renderFn = widget.objectForKeyedSubscript("render"),
      renderFn.isObject,
      renderFn.objectForKeyedSubscript("call") != nil
    else {
      VoltraLogger.widget.error("[\(TAG)] Bundle evaluated but did not expose render() for widgetId=\(widgetId)")
      return false
    }
    _ = renderFn

    VoltraLogger.widget.info("[\(TAG)] Bundle evaluated for widgetId=\(widgetId) (\(source.count) chars)")
    return true
  }

  /// Invoke the previously-evaluated widget's `render(propsJSON, envJSON)` function and
  /// return its resolved JSON string output.
  ///
  /// Returns `nil` if the widget hasn't been evaluated, the function throws, or the
  /// result is not a string.
  public static func render(
    widgetId: String,
    propsJSON: String,
    envJSON: String
  ) -> String? {
    lock.lock()
    defer { lock.unlock() }

    guard let ctx = _context else {
      VoltraLogger.widget.error("[\(TAG)] render(\(widgetId)): no JSContext (call evaluateBundle first)")
      return nil
    }

    guard
      let registry = ctx.objectForKeyedSubscript("__voltraWidgets"),
      !registry.isUndefined,
      let widget = registry.objectForKeyedSubscript(widgetId),
      !widget.isUndefined,
      let renderFn = widget.objectForKeyedSubscript("render"),
      renderFn.isObject
    else {
      VoltraLogger.widget.error("[\(TAG)] render(\(widgetId)): no captured render() — bundle not evaluated?")
      return nil
    }

    ctx.exception = nil
    guard let result = renderFn.call(withArguments: [propsJSON, envJSON]) else {
      VoltraLogger.widget.error("[\(TAG)] render(\(widgetId)): call returned nil")
      return nil
    }
    if let message = exceptionMessage(ctx) {
      VoltraLogger.widget.error("[\(TAG)] render(\(widgetId)) threw: \(message)")
      return nil
    }

    guard result.isString else {
      VoltraLogger.widget.error("[\(TAG)] render(\(widgetId)) did not return a string")
      return nil
    }
    return result.toString()
  }

  // MARK: - Lifecycle

  private static func context() -> JSContext? {
    if let existing = _context { return existing }
    guard let ctx = JSContext() else {
      VoltraLogger.widget.error("[\(TAG)] Failed to create JSContext")
      return nil
    }
    ctx.exceptionHandler = { _, exception in
      VoltraLogger.widget.error("[\(TAG)] JS exception: \(exception?.toString() ?? "unknown")")
    }
    _context = ctx
    return ctx
  }

  // MARK: - Helpers

  private static func exceptionMessage(_ ctx: JSContext) -> String? {
    guard let exc = ctx.exception, !exc.isUndefined, !exc.isNull else { return nil }
    ctx.exception = nil
    return exc.toString()
  }

  private static func jsStringLiteral(_ value: String) -> String {
    let escaped = value
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
      .replacingOccurrences(of: "\n", with: "\\n")
      .replacingOccurrences(of: "\r", with: "\\r")
    return "\"\(escaped)\""
  }
}
