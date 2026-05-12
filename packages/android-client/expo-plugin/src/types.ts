import type { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetInitialStatePath, WidgetLabel } from '@use-voltra/expo-plugin'

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
