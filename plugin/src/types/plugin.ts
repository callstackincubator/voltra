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
   * Minimum width in dp. If provided, takes precedence over minCellWidth.
   */
  minWidth?: number
  /**
   * Minimum height in dp. If provided, takes precedence over minCellHeight.
   */
  minHeight?: number
  /**
   * Minimum width in cells. Used to derive minWidth if not provided: (N * 70) - 30
   */
  minCellWidth?: number
  /**
   * Minimum height in cells. Used to derive minHeight if not provided: (N * 70) - 30
   */
  minCellHeight?: number
  /**
   * Target cell width (Android 12+, 1-5 cells)
   */
  targetCellWidth: number
  /**
   * Target cell height (Android 12+, 1-5 cells)
   */
  targetCellHeight: number
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
  /**
   * Path to a file that default exports a WidgetVariants object for initial widget state.
   * This will be pre-rendered at build time and bundled into the app.
   */
  initialStatePath?: string
  /**
   * Path to preview image for widget picker (PNG/JPG/WebP).
   * Sets android:previewImage attribute. Works on all Android versions.
   * On Android 12+, combine with previewLayout for better results.
   */
  previewImage?: string
  /**
   * Path to custom XML layout for RemoteViews preview (Android 12+).
   * Sets android:previewLayout attribute for scalable previews.
   * If not provided but previewImage is set, an auto-layout will be generated.
   */
  previewLayout?: string
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
  groupIdentifier?: string
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
   * Custom target name for the widget extension
   * If not provided, defaults to "{AppName}LiveActivity"
   * Useful for matching existing provisioning profiles or credentials
   */
  targetName?: string
  /**
   * Custom fonts to include in the Live Activity extension.
   * Provide an array of font file paths or directories containing fonts.
   * Supports .ttf, .otf, .woff, and .woff2 formats.
   *
   * This is equivalent to expo-font but for the Live Activity extension.
   * @see https://docs.expo.dev/versions/latest/sdk/font/
   */
  fonts?: string[]
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
  groupIdentifier?: string
  projectRoot: string
  platformProjectRoot: string
  fonts?: string[]
}

/**
 * Props passed to Android-related plugins
 */
export interface AndroidPluginProps {
  widgets: AndroidWidgetConfig[]
  userImagesPath?: string
}
