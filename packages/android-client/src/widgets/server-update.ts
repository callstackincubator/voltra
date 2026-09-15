import type { WidgetServerUpdateOptions, WidgetServerUpdateSettings, WidgetServerUpdateSnapshot } from '../types.js'
import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'

export type {
  WidgetServerUpdateBody,
  WidgetServerUpdateOptions,
  WidgetServerUpdateSettings,
  WidgetServerUpdateSnapshot,
} from '../types.js'

/**
 * Overrides a server-driven widget's `serverUpdate` settings at runtime.
 *
 * The `serverUpdate` entry in app.json supplies the defaults; this replaces any of them for one
 * widget, or for every server-driven widget when no `widgetId` is given. A widget-scoped call wins
 * over a global one, and `headers` and `query` merge per key across the two.
 *
 * Each call replaces the whole layer it writes, so pass every field you want to keep. Setting
 * anything reschedules the widgets it affects and fetches once immediately.
 *
 * @example Point a widget at the tenant's own backend once the user has logged in.
 * ```ts
 * await setWidgetServerUpdate(
 *   { url: `https://${tenant}.example.com/widgets/portfolio`, headers: { Authorization: `Bearer ${token}` } },
 *   { widgetId: 'portfolio' }
 * )
 * ```
 *
 * @example Take a widget over and drive it from the app until you hand it back.
 * ```ts
 * await setWidgetServerUpdate({ enabled: false }, { widgetId: 'portfolio' })
 * await updateAndroidDynamicWidget('portfolio', localProps)
 * ```
 *
 * @throws if the widget has no `serverUpdate` in app.json, if the URL is not https (plain http is
 *   allowed only in a debug build, and only for a local dev host), or if `query` names one of the
 *   parameters Voltra already sends.
 */
export async function setWidgetServerUpdate(
  settings: WidgetServerUpdateSettings,
  options?: WidgetServerUpdateOptions
): Promise<void> {
  return getNativeVoltraAndroid().setWidgetServerUpdate(JSON.stringify(settings ?? {}), options?.widgetId ?? null)
}

/**
 * Drops the runtime settings for one widget, or the global ones when no `widgetId` is given, so
 * the widget falls back to what app.json configured.
 *
 * Clearing the global settings is the logout gesture: along with the settings it drops what the
 * server last sent for every server-driven widget, so a Dynamic Widget goes back to `{}` with
 * `env.serverUpdate.status` of `never` rather than showing the previous account's data. Credentials
 * set with the deprecated `setWidgetServerCredentials` are stored separately — clear those with
 * `clearWidgetServerCredentials`.
 */
export async function clearWidgetServerUpdate(options?: WidgetServerUpdateOptions): Promise<void> {
  return getNativeVoltraAndroid().clearWidgetServerUpdate(options?.widgetId ?? null)
}

/**
 * Reads a widget's `serverUpdate` settings back, without reasoning about what was set where.
 *
 * With a `widgetId`, this is the fully resolved settings that widget would fetch with right now:
 * every layer flattened and app.json's defaults applied — `null` if the widget is not
 * server-driven. Without one, this is the raw contents of the global layer only — what the last
 * `setWidgetServerUpdate(settings)` call (with no `widgetId`) wrote, with no defaults applied and
 * every field optional — `null` if nothing has been set globally.
 *
 * @example Check what a widget is about to fetch from.
 * ```ts
 * const snapshot = await getWidgetServerUpdate({ widgetId: 'portfolio' })
 * if (snapshot?.enabled) {
 *   console.log(`portfolio fetches ${snapshot.url} every ${snapshot.intervalMinutes}m`)
 * }
 * ```
 */
export async function getWidgetServerUpdate(options: { widgetId: string }): Promise<WidgetServerUpdateSnapshot | null>
export async function getWidgetServerUpdate(options?: undefined): Promise<WidgetServerUpdateSettings | null>
export async function getWidgetServerUpdate(
  options?: WidgetServerUpdateOptions
): Promise<WidgetServerUpdateSnapshot | WidgetServerUpdateSettings | null> {
  const json = await getNativeVoltraAndroid().getWidgetServerUpdate(options?.widgetId ?? null)
  return json == null ? null : JSON.parse(json)
}
