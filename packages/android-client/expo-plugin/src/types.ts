import type { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetInitialStatePath, WidgetLabel } from '@use-voltra/expo-plugin'

/**
 * A single user-configurable parameter exposed via AppIntent / Glance config
 * (Track 4 PoC, Android).
 */
export interface AppIntentParameter {
  /** Property name used in `appIntentParam()` template expressions */
  name: string
  /** Human-readable label (used by future Glance configuration activity UI) */
  title: string
  /** Default value used before the user configures the widget */
  default?: string
}

/**
 * AppIntent configuration for a reactive Android widget. When set, the Voltra
 * plugin copies the `@use-voltra/android-renderer` JS bundle into the Android
 * assets so `VoltraJSRenderer` can resolve `{{ appIntent.X }}` placeholders at
 * render time.
 */
export interface AndroidWidgetAppIntentConfig {
  parameters: AppIntentParameter[]
}

/**
 * Configuration for a single Android home screen widget.
 */
export interface AndroidWidgetConfig {
  id: string
  displayName: WidgetLabel
  description: WidgetLabel
  minWidth?: number
  minHeight?: number
  minCellWidth?: number
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
   * AppIntent configuration for user-configurable widgets (Track 4 PoC). When
   * set, the plugin copies the resolver bundle and the renderer resolves
   * `{{ appIntent.X }}` placeholders at Glance render time.
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
