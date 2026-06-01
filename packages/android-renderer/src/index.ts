// Voltra widget payload resolver — Android (Track 4 PoC).
//
// Pure-JS template substitution for `{{ appIntent.X }}` placeholders. Runs inside
// the standalone Hermes runtime owned by VoltraJSRenderer.kt (see
// packages/android-client/android/src/main/cpp/voltra_js_renderer.cpp).
//
// Mirror of iOS Track 2's @use-voltra/ios-renderer — same logic, different
// packaging target. If both PoCs eventually merge, the packages collapse into a
// single platform-neutral `@use-voltra/widget-renderer`.

export type AppIntentParams = Record<string, string>

// Keys whose values are never traversed for resolution.
// 'v' (version) and 'e' (shared elements / $r refs) are structural — leave untouched.
// 's' (shared stylesheet) is NOT a passthrough: AppIntent template expressions may
// appear in style values.
const PASSTHROUGH_KEYS = new Set(['v', 'e'])

/**
 * Substitutes {{ appIntent.paramName }} template expressions.
 * Unknown parameters are replaced with an empty string.
 */
function resolveTemplate(value: string, appIntentParams: AppIntentParams): string {
  return value.replace(/\{\{\s*appIntent\.(\w+)\s*\}\}/g, (_, key: string) => appIntentParams[key] ?? '')
}

function resolveValue(value: unknown, appIntentParams: AppIntentParams): unknown {
  if (typeof value === 'string') {
    return resolveTemplate(value, appIntentParams)
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, appIntentParams))
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    // Element refs ($r) are resolved by the Swift/Kotlin layer after resolution — pass through unchanged
    if ('$r' in obj) return obj
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, resolveValue(v, appIntentParams)]))
  }
  return value
}

/**
 * Resolves AppIntent template expressions in a Voltra payload, returning a payload
 * ready for the Glance render path.
 *
 * The version (v) and shared elements (e) keys are passed through unchanged so the
 * Kotlin interpreter can still resolve element refs.
 */
export function resolve(payload: Record<string, unknown>, appIntentParams: AppIntentParams): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      PASSTHROUGH_KEYS.has(key) ? value : resolveValue(value, appIntentParams),
    ])
  )
}
