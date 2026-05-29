export type ColorScheme = 'light' | 'dark';
export type WidgetRenderingMode = 'fullColor' | 'accented' | 'vibrant';

export type DeviceState = {
  colorScheme: ColorScheme;
  widgetRenderingMode: WidgetRenderingMode;
};

export type AppIntentParams = Record<string, string>;

// Keys whose values are never traversed for resolution.
// 'v' (version) and 'e' (shared elements / $r refs) are structural — leave untouched.
// 's' (shared stylesheet) is NOT a passthrough: it contains light-dark() color strings
// that must be resolved against the current colorScheme.
const PASSTHROUGH_KEYS = new Set(['v', 'e']);

/**
 * Resolves the CSS light-dark(<light>, <dark>) function against the current color scheme.
 * Handles nested parentheses (e.g. rgba() or hsl() arguments).
 */
function resolveLightDark(value: string, colorScheme: ColorScheme): string {
  const PREFIX = 'light-dark(';
  if (!value.startsWith(PREFIX)) return value;

  const inner = value.slice(PREFIX.length);
  let depth = 0;
  let commaAt = -1;
  let closeAt = -1;

  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      if (depth === 0) {
        closeAt = i;
        break;
      }
      depth--;
    } else if (ch === ',' && depth === 0 && commaAt === -1) {
      commaAt = i;
    }
  }

  if (commaAt === -1 || closeAt === -1) return value;

  const light = inner.slice(0, commaAt).trim();
  const dark = inner.slice(commaAt + 1, closeAt).trim();
  return colorScheme === 'light' ? light : dark;
}

/**
 * Substitutes {{ appIntent.paramName }} template expressions.
 * Unknown parameters are replaced with an empty string.
 */
function resolveTemplate(value: string, appIntentParams: AppIntentParams): string {
  return value.replace(/\{\{\s*appIntent\.(\w+)\s*\}\}/g, (_, key: string) => appIntentParams[key] ?? '');
}

function resolveString(value: string, deviceState: DeviceState, appIntentParams: AppIntentParams): string {
  return resolveTemplate(value, appIntentParams);
}

function resolveValue(value: unknown, deviceState: DeviceState, appIntentParams: AppIntentParams): unknown {
  if (typeof value === 'string') {
    return resolveString(value, deviceState, appIntentParams);
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, deviceState, appIntentParams));
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Element refs ($r) are resolved by the Swift layer after resolution — pass through unchanged
    if ('$r' in obj) return obj;
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, resolveValue(v, deviceState, appIntentParams)])
    );
  }
  return value;
}

/**
 * Resolves all variant-aware values in a Voltra payload against the current device state
 * and AppIntent parameters, returning a fully resolved payload ready for the Swift interpreter.
 *
 * Variant-aware values currently supported:
 *   - light-dark(<light>, <dark>) strings in any prop — resolved via colorScheme
 *   - {{ appIntent.<param> }} template expressions — substituted from appIntentParams
 *
 * The version (v), shared stylesheet (s), and shared elements (e) keys are passed through
 * unchanged so the Swift interpreter can still resolve element refs and style indices.
 */
export function resolve(
  payload: Record<string, unknown>,
  deviceState: DeviceState,
  appIntentParams: AppIntentParams
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      PASSTHROUGH_KEYS.has(key) ? value : resolveValue(value, deviceState, appIntentParams),
    ])
  );
}