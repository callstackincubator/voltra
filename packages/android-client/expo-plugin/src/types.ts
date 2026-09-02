import type { ConfigPlugin } from '@expo/config-plugins'

import type { DynamicWidgetEntryConfig, WidgetInitialStatePath, WidgetLabel } from '@use-voltra/expo-plugin'

/**
 * A single user-configurable parameter for a Dynamic Widget. Android has no system-managed
 * widget configuration UI (unlike iOS's WidgetConfigurationIntent), so the value is set at runtime
 * via `setWidgetConfiguration`; `default` is the code-declared value shown before any runtime edit.
 * The same `appIntent` key is used as on iOS for a single cross-platform `app.json` schema.
 */
export interface AppIntentParameter {
  name: string
  title?: string
  default?: string
}

export interface AndroidWidgetAppIntentConfig {
  parameters: AppIntentParameter[]
}

/**
 * Configuration for a single Android home screen widget.
 *
 * `entry` is required only for Dynamic Widgets. Widgets without `entry` remain server-rendered /
 * server-updated legacy widgets and are excluded from the Dynamic Widgets manifest.
 */
export interface AndroidWidgetConfig extends DynamicWidgetEntryConfig {
  id: string
  displayName: WidgetLabel
  description: WidgetLabel
  /** Minimum widget width in dp. Only affects Android 11 and older. */
  minWidth?: number
  /** Minimum widget height in dp. Only affects Android 11 and older. */
  minHeight?: number
  /**
   * @deprecated Use `minWidth` instead. Approximated in dp for Android 11 and older, since cell
   * size varies by device, launcher and orientation.
   */
  minCellWidth?: number
  /**
   * @deprecated Use `minHeight` instead. Approximated in dp for Android 11 and older, since cell
   * size varies by device, launcher and orientation.
   */
  minCellHeight?: number
  targetCellWidth: number
  targetCellHeight: number
  resizeMode?: 'none' | 'horizontal' | 'vertical' | 'horizontal|vertical'
  widgetCategory?: 'home_screen' | 'keyguard' | 'home_screen|keyguard'
  initialStatePath?: WidgetInitialStatePath
  serverUpdate?: AndroidWidgetServerUpdateConfig
  previewImage?: string
  previewLayout?: string
  /**
   * Code-declared configuration parameters surfaced to a Dynamic Widget as
   * `env.configuration`. `parameters[].default` is emitted to the app's assets so the widget shows
   * it before any runtime configuration; runtime values (set via `setWidgetConfiguration`) override.
   */
  appIntent?: AndroidWidgetAppIntentConfig
}

/**
 * Server-driven Android widget updates (WorkManager).
 */
export interface AndroidWidgetServerUpdateConfig {
  url: string
  /** @default 60 */
  intervalMinutes?: number
  /** @default false */
  refresh?: boolean
}

/**
 * Options for `@use-voltra/android-client` Expo config plugin.
 */
export interface AndroidConfigPluginProps {
  enableNotifications?: boolean
  widgets?: AndroidWidgetConfig[]
  fonts?: string[]
}

export type VoltraAndroidConfigPlugin = ConfigPlugin<AndroidConfigPluginProps | undefined>

export interface AndroidPluginProps {
  enableNotifications?: boolean
  widgets: AndroidWidgetConfig[]
  userImagesPath?: string
  fonts?: string[]
}
