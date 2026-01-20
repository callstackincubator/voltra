import { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetConfig } from './widget'

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
   * Configuration for home screen widgets
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
