import Foundation
import JavaScriptCore

/// JavaScriptCore-backed runtime for Voltra **Dynamic Widgets**.
///
/// Each widget ships its own Metro bundle that defines `module.exports.render(props, env)`
/// (see `example/metro/widgetRegistry.js`). When evaluated, the bundle ends with `__r(0)`
/// which executes its entry module; the source is wrapped with a small bootstrap that
/// captures those exports into `globalThis.__voltraWidgets[<widgetId>]` so `render` can be
/// called from native at any later moment.
///
/// One shared `JSContext` per process. Each subsequent bundle evaluation overwrites Metro's
/// `__r`/`__d` globals (they're closure-scoped per bundle's IIFE), but the captured
/// `globalThis.__voltraWidgets[<widgetId>]` reference retains each widget's render function
/// indefinitely.
public enum VoltraJSRenderer {
  private static var _context: JSContext?
  private static var liveActivitySources: [String: String] = [:]
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
  public static func evaluateBundle(source: String, widgetId: String) -> Result<Void, DynamicWidgetRenderFailure> {
    evaluateBundle(source: source, id: widgetId, registryName: "__voltraWidgets", kind: "widget")
  }

  /// Evaluate a Dynamic Live Activity bundle in the shared JSContext. Its exports
  /// are captured separately from Dynamic Widgets so both collections may use the
  /// same definition ID without overwriting one another.
  public static func evaluateLiveActivityBundle(source: String, definitionId: String) -> Bool {
    let evaluated = evaluateBundle(
      source: source,
      id: definitionId,
      registryName: "__voltraDynamicLiveActivities",
      kind: "live activity"
    ).isSuccess
    if evaluated {
      lock.lock()
      liveActivitySources[definitionId] = source
      lock.unlock()
    }
    return evaluated
  }

  private static func evaluateBundle(
    source: String,
    id: String,
    registryName: String,
    kind: String
  ) -> Result<Void, DynamicWidgetRenderFailure> {
    lock.lock()
    defer { lock.unlock() }

    guard let ctx = context() else {
      VoltraLogger.widget.error("[\(TAG)] No JSContext available")
      return .failure(DynamicWidgetRenderFailure(stage: .evaluate, message: "No JSContext available"))
    }

    let escapedId = jsStringLiteral(id)
    // Metro emits the bundle's entry invocation as `__r(<entryModuleId>);` near the
    // end of the file (before the sourcemap/sourceURL comments). The entry id is NOT
    // always 0 — when Metro serves multiple widget bundles from the same process, it
    // shares its module-id registry across bundles so the second/third widget's entry
    // gets a higher id (e.g. `__r(74);`). We extract whatever id Metro produced and
    // re-invoke it; Metro's `__r` caches module exports, so the second invocation
    // returns the same exports the bundle already evaluated.
    let entryModuleId = extractEntryModuleId(from: source) ?? 0
    let wrapped = """
    \(source)
    ;(function () {
      if (!globalThis.\(registryName)) { globalThis.\(registryName) = {}; }
      globalThis.\(registryName)[\(escapedId)] = __r(\(entryModuleId));
    })();
    """

    ctx.exception = nil
    // A source URL makes the stack frames of a throw carry a location (`render@voltra/inbox.bundle:31:22`).
    ctx.evaluateScript(wrapped, withSourceURL: URL(string: "voltra/\(id).bundle"))
    if let thrown = takeException(ctx) {
      VoltraLogger.widget.error("[\(TAG)] Bundle eval failed for \(kind) id=\(id): \(thrown.message)")
      return .failure(DynamicWidgetRenderFailure(stage: .evaluate, message: thrown.message, stack: thrown.stack))
    }

    // Verify the bootstrap captured the exports correctly
    guard
      let registry = ctx.objectForKeyedSubscript(registryName),
      !registry.isUndefined,
      let entry = registry.objectForKeyedSubscript(id),
      !entry.isUndefined,
      let renderFn = entry.objectForKeyedSubscript("render"),
      renderFn.isObject,
      renderFn.objectForKeyedSubscript("call") != nil
    else {
      VoltraLogger.widget.error("[\(TAG)] Bundle evaluated but did not expose render() for \(kind) id=\(id)")
      return .failure(DynamicWidgetRenderFailure(stage: .evaluate, message: "Bundle evaluated but did not export render() for \(kind) \"\(id)\""))
    }
    _ = renderFn

    VoltraLogger.widget.info("[\(TAG)] Bundle evaluated for \(kind) id=\(id) (\(source.count) chars)")
    return .success(())
  }

  /// Ensure the widget's bundle is evaluated in *this process's* JSContext, returning true if its
  /// `render()` is available afterward.
  ///
  /// Cheap no-op when the widget is already captured in this process (the warm case: the provider
  /// just evaluated it). Evaluates from `source` when the context is fresh — which is what happens
  /// when WidgetKit re-renders an archived entry in a new extension process, where the provider's
  /// evaluation never ran. The View calls this before `render()` so rendering never depends on
  /// which process evaluated the bundle.
  public static func ensureEvaluated(widgetId: String, source: String) -> Result<Void, DynamicWidgetRenderFailure> {
    ensureEvaluated(source: source, id: widgetId, registryName: "__voltraWidgets", kind: "widget")
  }

  public static func ensureLiveActivityEvaluated(definitionId: String, source: String) -> Bool {
    lock.lock()
    let currentSource = liveActivitySources[definitionId]
    let hasRender =
      _context?
        .objectForKeyedSubscript("__voltraDynamicLiveActivities")?
        .objectForKeyedSubscript(definitionId)?
        .objectForKeyedSubscript("render")?
        .isObject ?? false
    lock.unlock()
    if hasRender, currentSource == source {
      return true
    }
    return evaluateLiveActivityBundle(source: source, definitionId: definitionId)
  }

  private static func ensureEvaluated(
    source: String,
    id: String,
    registryName: String,
    kind: String
  ) -> Result<Void, DynamicWidgetRenderFailure> {
    lock.lock()
    let alreadyEvaluated =
      _context?
        .objectForKeyedSubscript(registryName)?
        .objectForKeyedSubscript(id)?
        .objectForKeyedSubscript("render")?
        .isObject ?? false
    lock.unlock()

    if alreadyEvaluated {
      return .success(())
    }
    return evaluateBundle(source: source, id: id, registryName: registryName, kind: kind)
  }

  /// Invoke the previously-evaluated widget's `render(propsJSON, envJSON)` function and
  /// return its resolved JSON string output.
  ///
  /// Fails if the widget hasn't been evaluated, the function throws (the JS message and stack
  /// are carried), or the result is not a string.
  public static func render(
    widgetId: String,
    propsJSON: String,
    envJSON: String
  ) -> DynamicWidgetRenderOutcome {
    render(id: widgetId, propsJSON: propsJSON, envJSON: envJSON, registryName: "__voltraWidgets", kind: "widget")
  }

  /// Dates at which the widget wants to be drawn again, from the optional `timeline(props)` export of
  /// its entry module. The Metro wrapper exports it only when the entry has one and has already
  /// turned the result into an array of epoch milliseconds. Empty when there is no export or it
  /// throws: the widget then redraws only when it is reloaded, as it always has.
  public static func timelineDates(widgetId: String, propsJSON: String) -> [Date] {
    lock.lock()
    defer { lock.unlock() }

    guard
      let ctx = _context,
      let registry = ctx.objectForKeyedSubscript("__voltraWidgets"),
      !registry.isUndefined,
      let entry = registry.objectForKeyedSubscript(widgetId),
      !entry.isUndefined,
      let timelineFn = entry.objectForKeyedSubscript("timeline"),
      timelineFn.isObject
    else {
      return []
    }

    ctx.exception = nil
    let result = timelineFn.call(withArguments: [propsJSON])
    if let thrown = takeException(ctx) {
      VoltraLogger.widget.error("[\(TAG)] timeline widget id=\(widgetId): \(thrown.message)")
      return []
    }

    guard let data = result?.toString()?.data(using: .utf8),
          let timestamps = try? JSONDecoder().decode([Double].self, from: data)
    else {
      return []
    }
    return timestamps.map { Date(timeIntervalSince1970: $0 / 1000) }
  }

  /// Render a Dynamic Live Activity from its separately registered definition.
  public static func renderLiveActivity(
    definitionId: String,
    propsJSON: String,
    envJSON: String
  ) -> String? {
    try? render(
      id: definitionId,
      propsJSON: propsJSON,
      envJSON: envJSON,
      registryName: "__voltraDynamicLiveActivities",
      kind: "live activity"
    ).get()
  }

  private static func render(
    id: String,
    propsJSON: String,
    envJSON: String,
    registryName: String,
    kind: String
  ) -> DynamicWidgetRenderOutcome {
    lock.lock()
    defer { lock.unlock() }

    func fail(_ message: String, stack: String? = nil) -> DynamicWidgetRenderOutcome {
      VoltraLogger.widget.error("[\(TAG)] render \(kind) id=\(id): \(message)")
      return .failure(DynamicWidgetRenderFailure(stage: .render, message: message, stack: stack))
    }

    guard let ctx = _context else {
      return fail("no JSContext (call evaluateBundle first)")
    }

    guard
      let registry = ctx.objectForKeyedSubscript(registryName),
      !registry.isUndefined,
      let entry = registry.objectForKeyedSubscript(id),
      !entry.isUndefined,
      let renderFn = entry.objectForKeyedSubscript("render"),
      renderFn.isObject
    else {
      return fail("no captured render() — bundle not evaluated?")
    }

    ctx.exception = nil
    let result = renderFn.call(withArguments: [propsJSON, envJSON])
    if let thrown = takeException(ctx) {
      return fail(thrown.message, stack: thrown.stack)
    }

    guard let result else {
      return fail("call returned nil")
    }
    guard result.isString, let text = result.toString() else {
      return fail("render() returned \(describeType(result)), expected a string")
    }
    return .success(text)
  }

  // MARK: - Lifecycle

  private static func context() -> JSContext? {
    if let existing = _context {
      return existing
    }
    guard let ctx = JSContext() else {
      VoltraLogger.widget.error("[\(TAG)] Failed to create JSContext")
      return nil
    }
    ctx.exceptionHandler = { context, exception in
      // Installing a handler replaces the default one, which is what stores the exception on the
      // context. Keep that, so callers can read the message and stack of what was thrown.
      context?.exception = exception
      VoltraLogger.widget.error("[\(TAG)] JS exception: \(exception?.toString() ?? "unknown")")
    }
    _context = ctx
    return ctx
  }

  // MARK: - Helpers

  /// The pending JS exception, if any: its message (`TypeError: ...`) and its `stack`.
  private static func takeException(_ ctx: JSContext) -> (message: String, stack: String?)? {
    guard let exc = ctx.exception, !exc.isUndefined, !exc.isNull else { return nil }
    ctx.exception = nil
    let message = exc.toString() ?? "unknown JS exception"
    var stack: String?
    if exc.isObject, let value = exc.objectForKeyedSubscript("stack"), value.isString {
      stack = value.toString()
    }
    return (message, stack)
  }

  private static func describeType(_ value: JSValue) -> String {
    if value.isUndefined {
      return "undefined"
    }
    if value.isNull {
      return "null"
    }
    if value.isBoolean {
      return "a boolean"
    }
    if value.isNumber {
      return "a number"
    }
    if value.isArray {
      return "an array"
    }
    if value.isObject {
      return "an object"
    }
    return "a non-string value"
  }

  private static func jsStringLiteral(_ value: String) -> String {
    let escaped = value
      .replacingOccurrences(of: "\\", with: "\\\\")
      .replacingOccurrences(of: "\"", with: "\\\"")
      .replacingOccurrences(of: "\n", with: "\\n")
      .replacingOccurrences(of: "\r", with: "\\r")
    return "\"\(escaped)\""
  }

  /// Find the entry module id Metro emitted in the bundle's trailing `__r(<id>);`.
  /// Scans the LAST occurrence of `__r(<digits>);` in the source — every `__d(...)`
  /// module declaration also contains internal `__r(...)` calls, so taking the last
  /// match (the entrypoint invocation Metro appends at bundle's end) is what we want.
  private static func extractEntryModuleId(from source: String) -> Int? {
    guard let regex = try? NSRegularExpression(pattern: #"__r\((\d+)\);"#) else { return nil }
    let nsRange = NSRange(source.startIndex ..< source.endIndex, in: source)
    let matches = regex.matches(in: source, range: nsRange)
    guard let last = matches.last,
          let range = Range(last.range(at: 1), in: source),
          let id = Int(source[range])
    else { return nil }
    return id
  }
}

private extension Result where Success == Void {
  var isSuccess: Bool {
    if case .success = self {
      return true
    }
    return false
  }
}
