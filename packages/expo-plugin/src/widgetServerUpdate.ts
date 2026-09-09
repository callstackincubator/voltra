import { resolveServerUpdateInterval, resolveServerUpdateUrl, validateServerUpdateRefresh } from './serverUpdate'
import { logger } from './utils/logger'

/**
 * Expo-plugin side of the `serverUpdate` config rules. The rules themselves live in
 * `./serverUpdate`, which the `voltra` CLI mirrors; this module only turns them into the plugin's
 * thrown errors and console warnings.
 */

/** `serverUpdate` as it appears in app.json, before defaults are applied. */
export interface WidgetServerUpdateConfig {
  url?: string
  intervalMinutes?: number
  refresh?: boolean
}

/** `serverUpdate` after defaults, as the generators consume it. */
export interface ResolvedWidgetServerUpdateConfig {
  /** Absent when app.json set no URL — the app supplies one at runtime. */
  url?: string
  intervalMinutes: number
  refresh: boolean
}

export interface WidgetServerUpdateRules {
  /** True when the widget has an `entry` and so renders bundled JS from fetched props. */
  hasEntry: boolean
  /** Interval used when the widget sets none. Ignored for widgets with `entry`. */
  defaultIntervalMinutes: number
  /** Platform floor for payload widgets. Ignored for widgets with `entry`. */
  minimumIntervalMinutes: number
}

export function validateWidgetServerUpdate(
  serverUpdate: unknown,
  widgetId: string,
  rules: WidgetServerUpdateRules
): void {
  if (serverUpdate === undefined) {
    return
  }

  const context = `Widget '${widgetId}': serverUpdate`

  if (typeof serverUpdate !== 'object' || serverUpdate === null || Array.isArray(serverUpdate)) {
    throw new Error(`${context} must be an object`)
  }

  const { url, intervalMinutes, refresh } = serverUpdate as WidgetServerUpdateConfig

  const resolvedUrl = resolveServerUpdateUrl(url, context)

  if (resolvedUrl.kind === 'invalid') {
    throw new Error(resolvedUrl.error)
  }

  if (resolvedUrl.kind === 'insecure') {
    logger.warn(resolvedUrl.warning)
  }

  const interval = resolveServerUpdateInterval({
    intervalMinutes,
    context,
    hasEntry: rules.hasEntry,
    defaultIntervalMinutes: rules.defaultIntervalMinutes,
    minimumIntervalMinutes: rules.minimumIntervalMinutes,
  })

  if (interval.kind === 'invalid') {
    throw new Error(interval.error)
  }

  if (interval.kind === 'clamped') {
    logger.warn(interval.warning)
  }

  const refreshError = validateServerUpdateRefresh(refresh, context)

  if (refreshError) {
    throw new Error(refreshError)
  }
}

/**
 * Applies defaults to a validated `serverUpdate`. Generators call this instead of reading
 * `intervalMinutes` directly, so the value written into a plist or a generated asset is the one
 * the widget will actually be scheduled on.
 */
export function resolveWidgetServerUpdate(
  serverUpdate: WidgetServerUpdateConfig,
  rules: WidgetServerUpdateRules
): ResolvedWidgetServerUpdateConfig {
  const interval = resolveServerUpdateInterval({
    intervalMinutes: serverUpdate.intervalMinutes,
    context: 'serverUpdate',
    hasEntry: rules.hasEntry,
    defaultIntervalMinutes: rules.defaultIntervalMinutes,
    minimumIntervalMinutes: rules.minimumIntervalMinutes,
  })

  return {
    url: serverUpdate.url,
    // An invalid interval cannot reach here — validateWidgetServerUpdate throws on it first — but
    // if the two are ever called out of order, falling back to the platform's own default is less
    // surprising than silently switching a payload widget to the Dynamic one.
    intervalMinutes: interval.kind === 'invalid' ? rules.defaultIntervalMinutes : interval.intervalMinutes,
    refresh: serverUpdate.refresh === true,
  }
}
