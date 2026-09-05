import type { ConfigPlugin } from '@expo/config-plugins'

import type {
  DynamicLiveActivityEntryConfig,
  DynamicWidgetEntryConfig,
  WidgetInitialStatePath,
  WidgetLabel,
} from '@use-voltra/expo-plugin'

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
 * A single user-configurable parameter exposed via AppIntent (the native "Edit Widget" sheet).
 */
export interface AppIntentParameter {
  /** Swift property name + the key under `env.configuration`. */
  name: string
  /** Label shown in the widget configuration sheet. */
  title: string
  /** Default value used before the user configures the widget (the "from code" default). */
  default?: string
}

/**
 * AppIntent configuration for a user-configurable widget (iOS 17+).
 */
export interface IOSWidgetAppIntentConfig {
  /** Parameters the user can edit via "Edit Widget"; surfaced as `env.configuration`. */
  parameters: AppIntentParameter[]
}

/**
 * Configuration for a single iOS home screen widget.
 *
 * `entry` is required only for Dynamic Widgets. Widgets without `entry` remain server-rendered /
 * server-updated legacy widgets and are excluded from the Dynamic Widgets manifest.
 */
export interface IOSWidgetConfig extends DynamicWidgetEntryConfig {
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
  /**
   * AppIntent configuration (iOS 17+). When set on a Dynamic Widget, the plugin generates
   * an `AppIntentConfiguration` so users configure parameters via the native "Edit Widget" sheet;
   * defaults come from `parameters[].default`, and the configured values are passed into the
   * widget's `env.configuration` on each render.
   */
  appIntent?: IOSWidgetAppIntentConfig
}

/**
 * A Dynamic Live Activity bundled with the app.
 * @experimental
 */
export interface IOSDynamicLiveActivityConfig extends DynamicLiveActivityEntryConfig {}

/**
 * Server-driven iOS widget updates (WidgetKit background refresh).
 */
export interface IOSWidgetServerUpdateConfig {
  /**
   * Server endpoint that returns widget state updates. Omit it to mark the widget
   * server-driven and supply the URL at runtime with `setWidgetServerUpdate`.
   */
  url?: string
  /** @default 15, or 15 when the widget has an `entry` */
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
  /** @experimental Dynamic Live Activities rendered from bundled JavaScript entries. */
  liveActivities?: IOSDynamicLiveActivityConfig[]
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
  liveActivities?: IOSDynamicLiveActivityConfig[]
  groupIdentifier?: string
  keychainGroup?: string
  fonts?: string[]
  version: string
  buildNumber: string
}
