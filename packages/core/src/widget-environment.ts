/**
 * Env shape consumed by Dynamic Widgets.
 *
 * Dynamic Widgets are functions of `(props, env) => JSX`, evaluated inside the
 * Voltra JS runtime (JSC on iOS, Hermes on Android) at every render. The `env` second
 * argument is populated by the native runtime at draw time and carries:
 *
 * - **Runtime device state** (`colorScheme`, `widgetFamily`, etc.) captured per render
 * - **Platform-specific runtime state** (`widgetRenderingMode` on iOS), present only on the
 *   platform that has the concept
 * - **AppIntent / user-configured params** under `env.configuration` (TypeScript-typed per
 *   widget via the generic parameter)
 * - **Build env** under `env.build.*` — values that don't change between renders inside a
 *   process (isDev, Metro URL, app version, Voltra version)
 *
 * The shape mirrors expo-widgets' `WidgetEnvironment` for the runtime device fields, with
 * a Voltra-specific `env.build.*` namespace added for dev-mode tooling.
 *
 * @typeParam TConfig - Shape of `env.configuration` (AppIntent / user-configured params).
 *   Defaults to `undefined` for widgets that don't accept user configuration. Widget authors
 *   can supply a more specific type per widget for typed access.
 */
export type WidgetEnvironment<TConfig extends Record<string, unknown> | undefined = undefined> = {
  /** Date the widget is being rendered for. Transported as epoch ms over the JS boundary
   * and reconstructed as `Date` by the runtime entry. */
  date: Date

  /** Widget size family. iOS values: `systemSmall`, `systemMedium`, `systemLarge`, etc.
   * Android values: synthesized from Glance `LocalSize` (e.g. `"200x200"`). */
  widgetFamily: string

  /** Current color scheme of the widget's environment. May be `undefined` if the platform
   * doesn't expose it (rare). */
  colorScheme?: 'light' | 'dark'

  // ---------------------------------------------------------------------------
  // Locale and formatting preferences (ADR 0009)
  // Always pass these explicitly to `Intl` / `toLocale*` calls: the JS runtime's own default
  // locale and time zone are the process's, which may not match what the widget is drawn for.
  // ---------------------------------------------------------------------------

  /** BCP-47 locale tag the widget is being drawn in, including Unicode extensions for user
   * overrides — for example `"pl-PL"` or `"en-US-u-hc-h23"`. On iOS this is the locale the
   * widget extension resolved from the languages the app declares; see `preferredLanguages`
   * for the user's full list. */
  locale: string

  /** The user's ordered language list as BCP-47 tags, independent of what the app or the
   * widget extension supports. Use it (or `resolveLocale`) to pick a translation. */
  preferredLanguages: string[]

  /** Language the app asked Voltra to render widgets in with `setDynamicWidgetLocale`.
   * `undefined` unless the app set one. `resolveLocale` gives it precedence. */
  appLocale?: string

  /** Writing direction of `locale`. */
  layoutDirection: 'ltr' | 'rtl'

  /** Effective clock preference, already reconciled with the user's 12/24-hour setting. Pass it
   * as `hourCycle` to `Intl.DateTimeFormat`. */
  hourCycle: 'h12' | 'h23'

  /** IANA time zone of the device, for example `"Europe/Warsaw"`. Pass it as `timeZone` to
   * `Intl.DateTimeFormat` when formatting `date`. */
  timeZone: string

  /** Measurement system of the user's region. Absent when the platform cannot tell
   * (Android below API 28). */
  measurementSystem?: 'metric' | 'us' | 'uk'

  /** Unicode calendar identifier as `Intl` spells it, for example `"gregory"` or
   * `"japanese"`. */
  calendar?: string

  /** First day of the week in the user's region: `1` is Sunday, `2` is Monday … `7` is
   * Saturday (the `Calendar.firstWeekday` / `java.util.Calendar` numbering). */
  firstDayOfWeek?: 1 | 2 | 3 | 4 | 5 | 6 | 7

  // ---------------------------------------------------------------------------
  // iOS-only runtime values
  // Present only when rendering on iOS; `undefined` on Android.
  // ---------------------------------------------------------------------------

  /** iOS — rendering mode the widget is being drawn in. `fullColor` on home screen,
   * `accented` on tinted/Liquid Glass widgets (iOS 18+) and watchOS, `vibrant` on lock
   * screen. Maps to SwiftUI `@Environment(\.widgetRenderingMode)`. */
  widgetRenderingMode?: 'fullColor' | 'accented' | 'vibrant'

  /** iOS — whether the system is drawing a container background behind the widget.
   * Maps to SwiftUI `@Environment(\.showsWidgetContainerBackground)`. iOS 17+. */
  showsWidgetContainerBackground?: boolean

  // ---------------------------------------------------------------------------
  // System-managed configuration
  // ---------------------------------------------------------------------------

  /** AppIntent / user-configured parameters for this widget. `undefined` for widgets that
   * don't accept user configuration. Typed per widget via the [TConfig] generic. */
  configuration: TConfig

  // ---------------------------------------------------------------------------
  // Build env — static for the process lifetime, supplied by the runtime
  // ---------------------------------------------------------------------------

  /** Build / process-level metadata, populated by the runtime once per process. Static for
   * the JS runtime's lifetime; does not change between renders. */
  build: WidgetBuildEnvironment

  // ---------------------------------------------------------------------------
  // Server-driven updates
  // ---------------------------------------------------------------------------

  /** Outcome of the last server fetch, on widgets configured with `serverUpdate`. `undefined`
   * on every other widget. See {@link WidgetServerUpdateEnvironment}. */
  serverUpdate?: WidgetServerUpdateEnvironment

  /** The instance key (ADR 0007): a stable hash of this placement's merged `configuration`,
   * identical to what a server-driven widget's request sends as `instance`. `undefined` for a
   * widget with no configuration parameters at all — such a widget has exactly one instance,
   * and its requests and storage are unchanged by per-instance server fetches. */
  instance?: string
}

/**
 * What the device knows about the last attempt to fetch this widget's props from the server.
 *
 * A server-driven Dynamic Widget renders whatever props were last committed, so a fetch that
 * fails leaves the previous props on screen rather than blanking it. This is how the widget tells
 * the difference: show an "updated 3 min ago" line from `fetchedAt`, dim the UI when `status` is
 * `stale`, or hide the freshness line entirely while the app has taken the widget over
 * (`disabled`).
 */
export type WidgetServerUpdateEnvironment = {
  /**
   * - `fresh` — the last fetch succeeded (`200` or `304`).
   * - `stale` — a fetch has succeeded before, but the most recent one failed. `error` says how.
   * - `never` — no fetch has succeeded yet, so props are `{}` or whatever the app last wrote.
   * - `disabled` — fetching is off for this widget, because the app called
   *   `setWidgetServerUpdate({ enabled: false })` or no URL has been configured.
   */
  status: 'fresh' | 'stale' | 'never' | 'disabled'

  /** Epoch ms of the last `200` or `304`. Absent until a fetch has succeeded. */
  fetchedAt?: number

  /**
   * How the most recent fetch failed. Absent when `status` is `fresh`.
   *
   * - `network` — the request never completed (no connectivity, DNS, TLS, timeout).
   * - `http` — the server answered with a status the device cannot use.
   * - `unauthorized` — `401` or `403`; the app most likely needs to set a fresh token.
   * - `parse` — the body was not a JSON object, was too large, or looked like a Voltra payload
   *   rather than props.
   * - `render` — the props arrived but the widget threw while rendering them, so they were
   *   discarded rather than committed.
   */
  error?: 'network' | 'http' | 'unauthorized' | 'parse' | 'render'

  /** HTTP status of the last response, when there was one. */
  httpStatus?: number
}

/**
 * Build / process metadata available inside the widget render function. Populated by the
 * native runtime; identical across every render in a process.
 */
export type WidgetBuildEnvironment = {
  /** True when running against a development build (DEBUG / `__DEV__`). Used to gate
   * dev-mode behaviour like fetching bundles from Metro. */
  isDev: boolean

  /** URL of the Metro dev server when `isDev` is true. Used by the runtime to fetch widget
   * bundles for hot-reload. `undefined` in release builds. */
  metroUrl?: string

  /** App version string (`CFBundleShortVersionString` on iOS, `versionName` on Android). */
  appVersion: string

  /** Installed Voltra client package version — `@use-voltra/ios-client` or
   * `@use-voltra/android-client`, resolved from the app project when the native project is
   * generated. Surfaces in error reports and lets widgets gate behaviour by compatibility level
   * if needed. */
  voltraVersion: string
}

/**
 * Type guard — returns true when the runtime env is an iOS-platform env.
 *
 * @example
 *   if (isIosEnv(env)) {
 *     // env.widgetRenderingMode is narrowed to the concrete value (not undefined)
 *   }
 */
export function isIosEnv(
  env: WidgetEnvironment
): env is WidgetEnvironment & { widgetRenderingMode: NonNullable<WidgetEnvironment['widgetRenderingMode']> } {
  return env.widgetRenderingMode !== undefined
}

/**
 * Type guard — returns true when the runtime env is an Android-platform env.
 *
 * Android carries no platform-only runtime field (Material You colors are consumed via
 * `AndroidDynamicColors` tokens resolved by the native renderer, not through `env`), so this is
 * the complement of {@link isIosEnv}.
 */
export function isAndroidEnv(env: WidgetEnvironment): boolean {
  return !isIosEnv(env)
}
