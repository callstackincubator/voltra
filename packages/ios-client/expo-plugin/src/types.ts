import type { ConfigPlugin } from '@expo/config-plugins'

import type { WidgetInitialStatePath, WidgetLabel } from '@use-voltra/expo-plugin'

/**
 * Supported iOS Home Screen widget size families.
 */
export type IOSWidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

/**
 * A single user-configurable parameter exposed via AppIntent.
 */
export interface AppIntentParameter {
  name: string
  title: string
  default?: string
}

/**
 * AppIntent configuration for a reactive widget (iOS 17+).
 */
export interface IOSWidgetAppIntentConfig {
  parameters: AppIntentParameter[]
}

/**
 * Configuration for a single iOS home screen widget.
 */
export interface IOSWidgetConfig {
  /**
   * Unique identifier for the widget (used as the widget kind and in JS API)
   */
  id: string
  displayName: WidgetLabel
  description: WidgetLabel
  /** @default ['systemSmall', 'systemMedium', 'systemLarge'] */
  supportedFamilies?: IOSWidgetFamily[]
  initialStatePath?: WidgetInitialStatePath
  serverUpdate?: IOSWidgetServerUpdateConfig
  appIntent?: IOSWidgetAppIntentConfig
}

/**
 * Server-driven iOS widget updates (WidgetKit background refresh).
 */
export interface IOSWidgetServerUpdateConfig {
  url: string
  /** @default 15 */
  intervalMinutes?: number
  /** @default false */
  refresh?: boolean
}

/**
 * Files in the widget extension target (Xcode build phases / groups).
 */
export interface IOSWidgetExtensionFiles {
  swiftFiles: string[]
  entitlementFiles: string[]
  plistFiles: string[]
  assetDirectories: string[]
  intentFiles: string[]
  /** Paths relative to the widget extension root (e.g. en.lproj/VoltraWidgets.strings) */
  localizedStringResources: string[]
}

/**
 * Options for `@use-voltra/ios-client` Expo config plugin.
 */
export interface IOSConfigPluginProps {
  enablePushNotifications?: boolean
  groupIdentifier?: string
  widgets?: IOSWidgetConfig[]
  deploymentTarget?: string
  targetName?: string
  fonts?: string[]
  keychainGroup?: string
}

export type VoltraIosConfigPlugin = ConfigPlugin<IOSConfigPluginProps | undefined>

export interface IOSMainAppPluginProps {
  groupIdentifier?: string
  widgetIds?: string[]
  widgets?: IOSWidgetConfig[]
  keychainGroup?: string
}

export interface IOSWidgetExtensionPluginProps {
  targetName: string
  bundleIdentifier: string
  deploymentTarget: string
  widgets?: IOSWidgetConfig[]
  groupIdentifier?: string
  keychainGroup?: string
  fonts?: string[]
  version: string
  buildNumber: string
}
