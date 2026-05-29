import type { CLI_DEFAULTS } from './defaults'

export type VoltraPlatform = 'android' | 'ios'

/**
 * Per-locale widget copy or build-time initial state paths.
 * This intentionally matches the existing Expo plugin contract.
 */
export type WidgetLocalizedValue = Record<string, string>

/** Widget display text, either as a single string or localized by locale identifier. */
export type WidgetLabel = string | WidgetLocalizedValue

/** Path to a widget initial state module, either as a single path or localized by locale identifier. */
export type WidgetInitialStatePath = string | WidgetLocalizedValue

export interface AndroidWidgetServerUpdateConfig {
  /** Server endpoint that returns widget state updates. */
  url: string
  /** Refresh interval, in minutes, for fetching server updates. */
  intervalMinutes?: number
  /** Whether fetched updates should trigger an immediate widget refresh. */
  refresh?: boolean
}

export interface AndroidWidgetConfig {
  /** Stable widget identifier used in generated files and registrations. */
  id: string
  /** User-facing widget name shown by the launcher. */
  displayName: WidgetLabel
  /** User-facing widget description shown by the launcher. */
  description: WidgetLabel
  /** Minimum widget width in dp. */
  minWidth?: number
  /** Minimum widget height in dp. */
  minHeight?: number
  /** Minimum widget width in launcher grid cells. */
  minCellWidth?: number
  /** Minimum widget height in launcher grid cells. */
  minCellHeight?: number
  /** Default widget width in launcher grid cells. */
  targetCellWidth: number
  /** Default widget height in launcher grid cells. */
  targetCellHeight: number
  /** Supported resize directions for the Android widget. */
  resizeMode?: 'none' | 'horizontal' | 'vertical' | 'horizontal|vertical'
  /** Launcher surfaces where the widget can be placed. */
  widgetCategory?: 'home_screen' | 'keyguard' | 'home_screen|keyguard'
  /** Path to the build-time initial state module for this widget. */
  initialStatePath?: WidgetInitialStatePath
  /** Server-driven update settings for this widget. */
  serverUpdate?: AndroidWidgetServerUpdateConfig
  /** Path to the preview image shown in widget pickers. */
  previewImage?: string
  /** Path to a preview layout XML file shown in widget pickers. */
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
  /** Server endpoint that returns widget state updates. */
  url: string
  /** Refresh interval, in minutes, for fetching server updates. */
  intervalMinutes?: number
  /** Whether fetched updates should trigger an immediate widget refresh. */
  refresh?: boolean
}

export interface IOSWidgetConfig {
  /** Stable widget identifier used in generated files and registrations. */
  id: string
  /** User-facing widget name shown in iOS widget configuration UI. */
  displayName: WidgetLabel
  /** User-facing widget description shown in iOS widget configuration UI. */
  description: WidgetLabel
  /** Supported iOS widget families for this widget. */
  supportedFamilies?: IOSWidgetFamily[]
  /** Path to the build-time initial state module for this widget. */
  initialStatePath?: WidgetInitialStatePath
  /** Server-driven update settings for this widget. */
  serverUpdate?: IOSWidgetServerUpdateConfig
}

export interface AndroidProjectOverrides {
  /** Root directory of the Android native project. Defaults to `android/` under `projectRoot`. */
  rootDir?: string
  /** Android app module name. Defaults to `app` when it can be inferred. */
  appModuleName?: string
  /** Explicit path to the AndroidManifest.xml file for the app module. */
  manifestPath?: string
  /** Explicit Android package name if it cannot be derived from the project files. */
  packageName?: string
}

export interface IOSProjectOverrides {
  /** Root directory of the iOS native project. Defaults to `ios/` under `projectRoot`. */
  rootDir?: string
  /** Explicit path to the `.xcodeproj` directory to use for discovery. */
  xcodeprojPath?: string
  /** Main application target name when the Xcode project has multiple app targets. */
  mainTargetName?: string
  /** Explicit path to the app target Info.plist file. */
  infoPlistPath?: string
  /** Explicit path to the main app entitlements file. */
  entitlementsPath?: string
  /** Explicit path to the Podfile. */
  podfilePath?: string
}

/**
 * Public CLI config for Android. This stays close to the current Expo plugin props,
 * with explicit project discovery overrides added for native projects.
 */
export interface VoltraAndroidConfig {
  /** Whether to add the Android notification permission and related setup. */
  enableNotifications?: boolean
  /** Android widgets to generate and register. */
  widgets?: AndroidWidgetConfig[]
  /** Font files that should be bundled for Android widget rendering. */
  fonts?: string[]
  /** Directory containing user-provided images for Android widgets. */
  userImagesPath?: string
  /** Native Android project discovery overrides. */
  project?: AndroidProjectOverrides
}

/**
 * Public CLI config for iOS. This stays close to the current Expo plugin props,
 * with explicit project discovery overrides added for native projects.
 */
export interface VoltraIOSConfig {
  /** Whether to enable push-notification-related iOS setup for widgets and Live Activities. */
  enablePushNotifications?: boolean
  /** App Group identifier used to share data between the app and widget extension. */
  groupIdentifier?: string
  /** iOS widgets to generate and register. */
  widgets?: IOSWidgetConfig[]
  /** Minimum iOS deployment target for generated widget targets. */
  deploymentTarget?: string
  /** Override for the generated widget extension target name. */
  targetName?: string
  /** Font files that should be bundled for iOS widget rendering. */
  fonts?: string[]
  /** Directory containing user-provided images for iOS widgets. */
  userImagesPath?: string
  /** Keychain access group shared by the app and extension. */
  keychainGroup?: string
  /** Native iOS project discovery overrides. */
  project?: IOSProjectOverrides
}

export interface VoltraConfig {
  /** Root directory used to resolve relative paths in the Voltra config. Defaults to the config file directory. */
  projectRoot?: string
  /** Android-specific Voltra configuration. */
  android?: VoltraAndroidConfig
  /** iOS-specific Voltra configuration. */
  ios?: VoltraIOSConfig
}

export interface LoadedVoltraConfig {
  /** Parsed Voltra config object loaded from disk. */
  config: VoltraConfig
  /** Absolute path to the loaded config file, when the config came from a file. */
  configPath?: string
  /** Directory that contained the loaded config source. */
  configDir: string
}

export interface NormalizedAndroidWidgetServerUpdateConfig {
  /** Server endpoint that returns widget state updates. */
  url: string
  /** Refresh interval, in minutes, for fetching server updates. */
  intervalMinutes: number
  /** Whether fetched updates should trigger an immediate widget refresh. */
  refresh: boolean
}

export interface NormalizedAndroidWidgetConfig extends Omit<AndroidWidgetConfig, 'serverUpdate'> {
  /** Server-driven update settings after defaults have been applied. */
  serverUpdate?: NormalizedAndroidWidgetServerUpdateConfig
}

export interface NormalizedIOSWidgetServerUpdateConfig {
  /** Server endpoint that returns widget state updates. */
  url: string
  /** Refresh interval, in minutes, for fetching server updates. */
  intervalMinutes: number
  /** Whether fetched updates should trigger an immediate widget refresh. */
  refresh: boolean
}

export interface NormalizedIOSWidgetConfig extends Omit<IOSWidgetConfig, 'serverUpdate' | 'supportedFamilies'> {
  /** Supported iOS widget families after defaults have been applied. */
  supportedFamilies: IOSWidgetFamily[]
  /** Server-driven update settings after defaults have been applied. */
  serverUpdate?: NormalizedIOSWidgetServerUpdateConfig
}

export interface NormalizedAndroidProjectConfig {
  /** Absolute Android project root directory, if overridden. */
  rootDir?: string
  /** Resolved Android app module name. */
  appModuleName?: string
  /** Absolute path to AndroidManifest.xml, if overridden. */
  manifestPath?: string
  /** Explicit Android package name, if overridden. */
  packageName?: string
}

export interface NormalizedIOSProjectConfig {
  /** Absolute iOS project root directory, if overridden. */
  rootDir?: string
  /** Absolute path to the `.xcodeproj` directory, if overridden. */
  xcodeprojPath?: string
  /** Explicit main iOS application target name, if overridden. */
  mainTargetName?: string
  /** Absolute path to the Info.plist file, if overridden. */
  infoPlistPath?: string
  /** Absolute path to the entitlements file, if overridden. */
  entitlementsPath?: string
  /** Absolute path to the Podfile, if overridden. */
  podfilePath?: string
}

export interface NormalizedVoltraAndroidConfig {
  /** Whether Android notification setup should be applied. */
  enableNotifications: boolean
  /** Android widgets after validation and normalization. */
  widgets: NormalizedAndroidWidgetConfig[]
  /** Absolute font file paths for Android widgets. */
  fonts: string[]
  /** Absolute path to the Android user images directory. */
  userImagesPath: string
  /** Normalized Android native project discovery overrides. */
  project: NormalizedAndroidProjectConfig
}

export interface NormalizedVoltraIOSConfig {
  /** Whether iOS push-notification-related setup should be applied. */
  enablePushNotifications: boolean
  /** App Group identifier used to share data between the app and extension. */
  groupIdentifier?: string
  /** iOS widgets after validation and normalization. */
  widgets: NormalizedIOSWidgetConfig[]
  /** Effective iOS deployment target for generated widget targets. */
  deploymentTarget: string
  /** Effective widget extension target name override, if provided. */
  targetName?: string
  /** Absolute font file paths for iOS widgets. */
  fonts: string[]
  /** Absolute path to the iOS user images directory. */
  userImagesPath: string
  /** Keychain access group shared by the app and extension. */
  keychainGroup?: string
  /** Normalized iOS native project discovery overrides. */
  project: NormalizedIOSProjectConfig
}

export interface NormalizedVoltraConfig {
  /** Absolute path to the loaded config file, when the config came from a file. */
  configPath?: string
  /** Directory that contained the loaded config source. */
  configDir: string
  /** Absolute root directory used for resolving all project-relative paths. */
  projectRoot: string
  /** Normalized Android-specific Voltra configuration. */
  android?: NormalizedVoltraAndroidConfig
  /** Normalized iOS-specific Voltra configuration. */
  ios?: NormalizedVoltraIOSConfig
}

export type CliDefaults = typeof CLI_DEFAULTS
