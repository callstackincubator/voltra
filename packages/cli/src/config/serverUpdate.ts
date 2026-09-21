/**
 * Config rules for `serverUpdate`, shared by the Expo plugins and the `voltra` CLI.
 *
 * `serverUpdate` marks a widget as server-driven for both render engines. On a widget with
 * `entry` the device fetches a JSON object and hands it to the bundled JS as props; without
 * `entry` the server returns a full Voltra payload. Widgets without `entry` keep exactly the
 * rules they had before ADR 0002, so no existing config breaks.
 *
 * `url` is optional. `serverUpdate: {}` means "server-driven, URL supplied at runtime" through
 * `setWidgetServerUpdate`, which covers per-tenant backends whose URL is only known after login.
 *
 * These helpers report problems instead of throwing so each caller can raise its own error type.
 *
 * The `@use-voltra/expo-plugin` package holds the other copy of this module, shared by the
 * Expo config plugins; keep the two in sync.
 */

/**
 * Interval floor and default for a widget with `entry`. WorkManager cannot run periodic work
 * more often than every 15 minutes, and WidgetKit stretches timelines requested closer together
 * than five minutes, so a smaller number would only mislead.
 */
export const DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES = 15

/** Hosts allowed over plain `http`, for talking to a dev server from a simulator or emulator. */
const LOCAL_HTTP_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '10.0.2.2', '10.0.3.2'])

/** Outcome of resolving `serverUpdate.intervalMinutes` against a platform's floor. */
export type ServerUpdateIntervalResolution =
  | { kind: 'ok'; intervalMinutes: number }
  | { kind: 'clamped'; intervalMinutes: number; warning: string }
  | { kind: 'invalid'; error: string }

export interface ResolveServerUpdateIntervalOptions {
  /** Raw `intervalMinutes` from app.json, if the widget set one. */
  intervalMinutes: unknown
  /** Config path used in messages, e.g. `android.widgets[portfolio].serverUpdate`. */
  context: string
  /** True when the widget has an `entry` and therefore renders on device. */
  hasEntry: boolean
  /** Interval used when the widget does not set one. Ignored for widgets with `entry`. */
  defaultIntervalMinutes: number
  /** Platform floor for payload widgets. Ignored for widgets with `entry`. */
  minimumIntervalMinutes: number
}

/**
 * Resolves the interval a widget should be scheduled on.
 *
 * A widget with `entry` is clamped up to {@link DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES}
 * with a warning, because a shorter interval is not something either platform can honour. A
 * payload widget keeps the platform's existing rule and is rejected below the floor.
 */
export function resolveServerUpdateInterval(
  options: ResolveServerUpdateIntervalOptions
): ServerUpdateIntervalResolution {
  const { intervalMinutes, context, hasEntry, defaultIntervalMinutes, minimumIntervalMinutes } = options
  const fallback = hasEntry ? DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES : defaultIntervalMinutes

  if (intervalMinutes === undefined) {
    return { kind: 'ok', intervalMinutes: fallback }
  }

  if (typeof intervalMinutes !== 'number' || !Number.isFinite(intervalMinutes)) {
    return { kind: 'invalid', error: `${context}.intervalMinutes must be a number` }
  }

  if (!Number.isInteger(intervalMinutes)) {
    return { kind: 'invalid', error: `${context}.intervalMinutes must be an integer` }
  }

  if (hasEntry) {
    if (intervalMinutes < DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES) {
      return {
        kind: 'clamped',
        intervalMinutes: DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES,
        warning:
          `${context}.intervalMinutes is ${intervalMinutes}, below the ` +
          `${DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES} minute floor for widgets with an entry. ` +
          `Using ${DYNAMIC_WIDGET_SERVER_UPDATE_INTERVAL_MINUTES}.`,
      }
    }

    return { kind: 'ok', intervalMinutes }
  }

  if (intervalMinutes < minimumIntervalMinutes) {
    return { kind: 'invalid', error: `${context}.intervalMinutes must be at least ${minimumIntervalMinutes}` }
  }

  return { kind: 'ok', intervalMinutes }
}

/** Outcome of checking `serverUpdate.url`. */
export type ServerUpdateUrlResolution =
  | { kind: 'ok' }
  | { kind: 'insecure'; warning: string }
  | { kind: 'invalid'; error: string }

/**
 * Checks `serverUpdate.url`. An absent URL is fine — the app supplies it at runtime through
 * `setWidgetServerUpdate`.
 *
 * A URL that is not an absolute `http`/`https` URL is rejected: no platform HTTP stack here
 * accepts one, so such a config could only ever have failed to fetch. Plain `http` to a
 * non-local host is reported as insecure rather than rejected — App Transport Security and
 * Android's cleartext policy already block it in a release build, and rejecting it outright
 * would break configs that point at a LAN dev server.
 */
export function resolveServerUpdateUrl(url: unknown, context: string): ServerUpdateUrlResolution {
  if (url === undefined) {
    return { kind: 'ok' }
  }

  if (typeof url !== 'string' || !url.trim()) {
    return { kind: 'invalid', error: `${context}.url must be a non-empty string` }
  }

  let parsed: URL

  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'invalid', error: `${context}.url must be an absolute http(s) URL, received '${url}'` }
  }

  if (parsed.protocol === 'https:') {
    return { kind: 'ok' }
  }

  if (parsed.protocol !== 'http:') {
    return { kind: 'invalid', error: `${context}.url must be an absolute http(s) URL, received '${url}'` }
  }

  if (isLocalHttpHost(parsed.hostname)) {
    return { kind: 'ok' }
  }

  return {
    kind: 'insecure',
    warning:
      `${context}.url uses plain http ('${url}'). Release builds block cleartext traffic, so the ` +
      'widget will not fetch outside a development build. Use https, or a local dev host ' +
      `(${[...LOCAL_HTTP_HOSTS].join(', ')}).`,
  }
}

/** True for the hosts Voltra allows over plain `http` — dev servers reachable from a simulator. */
export function isLocalHttpHost(hostname: string): boolean {
  return LOCAL_HTTP_HOSTS.has(hostname.replace(/^\[|\]$/g, ''))
}

/** Validates `serverUpdate.refresh`. Returns an error message, or `undefined` when it is fine. */
export function validateServerUpdateRefresh(refresh: unknown, context: string): string | undefined {
  if (refresh !== undefined && typeof refresh !== 'boolean') {
    return `${context}.refresh must be a boolean`
  }

  return undefined
}
