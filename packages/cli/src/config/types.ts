import type { CLI_DEFAULTS } from './defaults'

export type VoltraPlatform = 'android' | 'ios'

/**
 * Per-locale widget copy or build-time initial state paths.
 * This intentionally matches the existing Expo plugin contract.
 */
export type WidgetLocalizedValue = Record<string, string>

export type WidgetLabel = string | WidgetLocalizedValue

export type WidgetInitialStatePath = string | WidgetLocalizedValue

export interface AndroidWidgetServerUpdateConfig {
  url: string
  intervalMinutes?: number
  refresh?: boolean
}

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

export type IOSWidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

export interface IOSWidgetServerUpdateConfig {
  url: string
  intervalMinutes?: number
  refresh?: boolean
}

export interface IOSWidgetConfig {
  id: string
  displayName: WidgetLabel
  description: WidgetLabel
  supportedFamilies?: IOSWidgetFamily[]
  initialStatePath?: WidgetInitialStatePath
  serverUpdate?: IOSWidgetServerUpdateConfig
}

export interface AndroidProjectOverrides {
  rootDir?: string
  appModuleName?: string
  manifestPath?: string
  packageName?: string
}

export interface IOSProjectOverrides {
  rootDir?: string
  xcodeprojPath?: string
  mainTargetName?: string
  infoPlistPath?: string
  entitlementsPath?: string
  podfilePath?: string
}

/**
 * Public CLI config for Android. This stays close to the current Expo plugin props,
 * with explicit project discovery overrides added for native projects.
 */
export interface VoltraAndroidConfig {
  enableNotifications?: boolean
  widgets?: AndroidWidgetConfig[]
  fonts?: string[]
  userImagesPath?: string
  project?: AndroidProjectOverrides
}

/**
 * Public CLI config for iOS. This stays close to the current Expo plugin props,
 * with explicit project discovery overrides added for native projects.
 */
export interface VoltraIOSConfig {
  enablePushNotifications?: boolean
  groupIdentifier?: string
  widgets?: IOSWidgetConfig[]
  deploymentTarget?: string
  targetName?: string
  fonts?: string[]
  keychainGroup?: string
  project?: IOSProjectOverrides
}

export interface VoltraConfig {
  projectRoot?: string
  android?: VoltraAndroidConfig
  ios?: VoltraIOSConfig
}

export interface LoadedVoltraConfig {
  config: VoltraConfig
  configPath?: string
  configDir: string
}

export interface NormalizedAndroidWidgetServerUpdateConfig {
  url: string
  intervalMinutes: number
  refresh: boolean
}

export interface NormalizedAndroidWidgetConfig extends Omit<AndroidWidgetConfig, 'serverUpdate'> {
  serverUpdate?: NormalizedAndroidWidgetServerUpdateConfig
}

export interface NormalizedIOSWidgetServerUpdateConfig {
  url: string
  intervalMinutes: number
  refresh: boolean
}

export interface NormalizedIOSWidgetConfig extends Omit<IOSWidgetConfig, 'serverUpdate' | 'supportedFamilies'> {
  supportedFamilies: IOSWidgetFamily[]
  serverUpdate?: NormalizedIOSWidgetServerUpdateConfig
}

export interface NormalizedAndroidProjectConfig {
  rootDir?: string
  appModuleName?: string
  manifestPath?: string
  packageName?: string
}

export interface NormalizedIOSProjectConfig {
  rootDir?: string
  xcodeprojPath?: string
  mainTargetName?: string
  infoPlistPath?: string
  entitlementsPath?: string
  podfilePath?: string
}

export interface NormalizedVoltraAndroidConfig {
  enableNotifications: boolean
  widgets: NormalizedAndroidWidgetConfig[]
  fonts: string[]
  userImagesPath: string
  project: NormalizedAndroidProjectConfig
}

export interface NormalizedVoltraIOSConfig {
  enablePushNotifications: boolean
  groupIdentifier?: string
  widgets: NormalizedIOSWidgetConfig[]
  deploymentTarget: string
  targetName?: string
  fonts: string[]
  keychainGroup?: string
  project: NormalizedIOSProjectConfig
}

export interface NormalizedVoltraConfig {
  configPath?: string
  configDir: string
  projectRoot: string
  android?: NormalizedVoltraAndroidConfig
  ios?: NormalizedVoltraIOSConfig
}

export type CliDefaults = typeof CLI_DEFAULTS
