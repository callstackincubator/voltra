import { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetConfig } from './widget'

/**
 * Configuration for a single Android widget
 */
export interface AndroidWidgetConfig {
  /**
   * Unique identifier for the widget
   */
  id: string
  /**
   * Display name shown in the widget picker
   */
  displayName: string
  /**
   * Description shown in the widget picker
   */
  description: string
  /**
   * Minimum width in dp
   * @default 110
   */
  minWidth?: number
  /**
   * Minimum height in dp
   * @default 110
   */
  minHeight?: number
  /**
   * Target cell width (Android 12+, 1-5 cells)
   * @default 2
   */
  targetCellWidth?: number
  /**
   * Target cell height (Android 12+, 1-5 cells)
   * @default 2
   */
  targetCellHeight?: number
  /**
   * Whether the widget can be resized
   * @default 'horizontal|vertical'
   */
  resizeMode?: 'none' | 'horizontal' | 'vertical' | 'horizontal|vertical'
  /**
   * Widget category
   * @default 'home_screen'
   */
  widgetCategory?: 'home_screen' | 'keyguard' | 'home_screen|keyguard'
}

/**
 * Android-specific plugin configuration
 */
export interface AndroidPluginConfig {
  /**
   * Android home screen widgets
   * Separate from iOS widgets to allow platform-specific configurations
   */
  widgets?: AndroidWidgetConfig[]
}

/**
 * Props for the Voltra config plugin
 */
export interface ConfigPluginProps {
  /**
   * Enable push notification support for Live Activities
   */
  enablePushNotifications?: boolean
  /**
   * App group identifier for sharing data between app and widget extension
   */
  groupIdentifier: string
  /**
   * Configuration for iOS home screen widgets (uses WidgetFamily sizing)
   * Each widget will be available in the widget gallery
   */
  widgets?: WidgetConfig[]
  /**
   * iOS deployment target version for the widget extension
   * If not provided, will use the main app's deployment target or fall back to the default
   */
  deploymentTarget?: string
  /**
   * Android-specific configuration
   */
  android?: AndroidPluginConfig
}

/**
 * The main Voltra config plugin type
 */
export type VoltraConfigPlugin = ConfigPlugin<ConfigPluginProps | undefined>

/**
 * Props passed to iOS-related plugins
 */
export interface IOSPluginProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: WidgetConfig[]
  groupIdentifier: string
  projectRoot: string
  platformProjectRoot: string
}

/**
 * Props passed to Android-related plugins
 */
export interface AndroidPluginProps {
  widgets: AndroidWidgetConfig[]
}
