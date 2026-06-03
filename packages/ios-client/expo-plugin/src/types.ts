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
  /**
   * Track 5 — opt-in to dev-mode hot-reload for client-rendered widgets (widgets declared
   * with a `'use voltra'` directive). Default: `false`.
   *
   * When `true` AND the build configuration is DEBUG:
   *   - The widget extension's Provider fetches the latest JSX bundle from Metro
   *     (`http://localhost:8081/voltra/widgets/<id>.bundle`) every time `getTimeline` runs.
   *   - `NSAppTransportSecurity` with a localhost exception is added to the widget
   *     extension's Info.plist so the fetch succeeds.
   *   - The consumer should call `enableClientWidgetHotReload()` from
   *     `@use-voltra/ios-client` at app startup so Metro HMR triggers
   *     `WidgetCenter.shared.reloadAllTimelines()` automatically when widget JSX changes.
   *
   * When `false` or in release builds: the widget always shows the prerendered placeholder
   * (Phase 5 will bake bundles into the .app for release).
   */
  clientWidgetHotReload?: boolean
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
  /** See [IOSConfigPluginProps.clientWidgetHotReload] — threaded through to file generators. */
  clientWidgetHotReload?: boolean
}
