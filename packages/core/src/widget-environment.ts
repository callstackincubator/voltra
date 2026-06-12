/**
 * Env shape consumed by client-rendered widgets.
 *
 * Client-rendered widgets are functions of `(props, env) => JSX`, evaluated inside the
 * Voltra JS runtime (JSC on iOS, Hermes on Android) at every render. The `env` second
 * argument is populated by the native runtime at draw time and carries:
 *
 * - **Runtime device state** (`colorScheme`, `widgetFamily`, etc.) captured per render
 * - **Platform-specific runtime state** (`widgetRenderingMode` on iOS, `materialColors` on
 *   Android), present only on the platform that has the concept
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

  /** BCP-47 locale tag — for example `"en-US"` or `"pl-PL"`. */
  locale?: string

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
  // Android-only runtime values
  // Present only when rendering on Android; `undefined` on iOS.
  // ---------------------------------------------------------------------------

  /** Android — Material You dynamic color tokens captured from
   * `MaterialTheme.colorScheme`. Field-for-field maps onto Compose `ColorScheme`
   * (primary, onPrimary, surface, onSurface, etc.). */
  materialColors?: MaterialColorScheme

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

  /** Voltra package version (`@use-voltra/core`). Surfaces in error reports and lets
   * widgets gate behaviour by compatibility level if needed. */
  voltraVersion: string
}

/**
 * Material You dynamic color tokens captured from Android `MaterialTheme.colorScheme`.
 * Field names map 1:1 onto Compose's `ColorScheme` properties. Each value is an RGBA
 * hex string (`#RRGGBBAA` or `#RRGGBB`). Available on Android only.
 */
export type MaterialColorScheme = {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiary: string
  onTertiary: string
  tertiaryContainer: string
  onTertiaryContainer: string
  background: string
  onBackground: string
  surface: string
  onSurface: string
  surfaceVariant: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  error: string
  onError: string
  errorContainer: string
  onErrorContainer: string
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
 */
export function isAndroidEnv(
  env: WidgetEnvironment
): env is WidgetEnvironment & { materialColors: NonNullable<WidgetEnvironment['materialColors']> } {
  return env.materialColors !== undefined
}
