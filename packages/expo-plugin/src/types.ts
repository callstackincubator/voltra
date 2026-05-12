import { ConfigPlugin } from '@expo/config-plugins'

/**
 * Type definitions for the Voltra plugin
 */

// ============================================================================
// Widget Types
// ============================================================================

/**
 * Per-locale strings for widget picker/gallery labels (`displayName`, `description`).
 * Keys should be BCP-47-style locale tags (e.g. `en`, `pl`, `pt-BR`). Plain `string` is still allowed for a single-language setup.
 */
export type WidgetLocalizedCopy = Record<string, string>

export type WidgetLabel = string | WidgetLocalizedCopy

/**
 * Build-time widget initial state source: a single file path, or per-locale paths (same key rules as `WidgetLocalizedCopy`).
 * Each path must point to a module that exports the widget variants / default export for prerendering.
 */
export type WidgetInitialStatePath = string | WidgetLocalizedCopy

/**
 * Supported widget size families
 */
export type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

// ============================================================================
// Configurable Widget Types
// ============================================================================

/**
 * A single configurable parameter for a widget.
 *
 * Parameters are surfaced as native controls in the iOS "Edit Widget" sheet (iOS 17+).
 * The parameter `id` is used as the Swift property name in the generated intent struct
 * and as the key in the parameters dictionary returned by `getWidgetParameters()`.
 * It must be a valid Swift identifier (alphanumeric + underscores, not starting with a digit).
 */
export type WidgetParameter =
  | {
      id: string
      type: 'bool'
      /** Label shown next to the toggle in the widget edit sheet. */
      label: WidgetLabel
      default?: boolean
    }
  | {
      id: string
      type: 'int'
      /** Label shown next to the number input in the widget edit sheet. */
      label: WidgetLabel
      default?: number
      min?: number
      max?: number
    }
  | {
      id: string
      type: 'double'
      /** Label shown next to the number input in the widget edit sheet. */
      label: WidgetLabel
      default?: number
    }
  | {
      id: string
      type: 'enum'
      /** Label shown above the picker in the widget edit sheet. */
      label: WidgetLabel
      cases: Array<{ value: string; label: WidgetLabel }>
      default?: string
    }

/**
 * Configuration for a single home screen widget
 */
export interface WidgetConfig {
  /**
   * Unique identifier for the widget (used as the widget kind and in JS API)
   * Must be alphanumeric with underscores only
   */
  id: string
  /**
   * Display name shown in the widget gallery.
   * For locale maps, keys must be BCP-47-like (`en`, `pl`, `pt-BR`, `zh-Hans`); include an English locale when possible so defaults align with Android `values/` and iOS fallbacks.
   */
  displayName: WidgetLabel
  /**
   * Description shown in the widget gallery (same rules as `displayName`).
   */
  description: WidgetLabel
  /**
   * Supported widget sizes
   * @default ['systemSmall', 'systemMedium', 'systemLarge']
   */
  supportedFamilies?: WidgetFamily[]
  /**
   * Path to a file that default exports a WidgetVariants object for initial widget state (or a locale map of paths).
   * This will be pre-rendered at build time and bundled into the iOS app.
   */
  initialStatePath?: WidgetInitialStatePath
  /**
   * Configurable parameters for the widget (iOS 17+).
   *
   * When set, the widget gains an "Edit Widget" button that presents a native configuration
   * sheet. Each parameter maps to a native control (`bool` → toggle, `int`/`double` → number
   * input, `enum` → picker). Current parameter values can be read on the React Native side via
   * `getWidgetParameters(widgetId)`.
   *
   * For server-driven widgets, the current parameter values are automatically appended as
   * query parameters on every server fetch. For non-server widgets, the `outdatedStatePath`
   * content is shown when parameters change until the React Native app re-renders the widget.
   */
  parameters?: WidgetParameter[]
  /**
   * Path to a file that default exports a WidgetVariants object representing the "outdated"
   * state shown when the user changes parameters but the React Native app hasn't re-rendered
   * the widget yet. Only relevant for non-server-driven configurable widgets.
   */
  outdatedStatePath?: WidgetInitialStatePath
  /**
   * Configuration for server-driven widget updates.
   * When configured, the widget will periodically fetch new content from a remote server
   * running Voltra SSR, without requiring the user to open the app.
   */
  serverUpdate?: WidgetServerUpdateConfig
}

/**
 * Configuration for server-driven widget updates.
 * Enables widgets to pull updates from a remote Voltra SSR service.
 */
export interface WidgetServerUpdateConfig {
  /**
   * The URL of the Voltra SSR endpoint that returns widget JSON.
   * The widget ID and family will be appended as query parameters.
   */
  url: string
  /**
   * How often the widget should fetch updates, in minutes.
   * iOS WidgetKit may throttle requests; minimum effective interval is ~15 minutes.
   * @default 15
   */
  intervalMinutes?: number
  /**
   * Whether to show a native refresh button in the top-right corner of the widget.
   * When tapped, triggers an immediate server update.
   * @default false
   */
  refresh?: boolean
}

/**
 * Structure describing the files in a widget extension target.
 * Used for configuring Xcode build phases and groups.
 */
export interface WidgetFiles {
  swiftFiles: string[]
  entitlementFiles: string[]
  plistFiles: string[]
  assetDirectories: string[]
  intentFiles: string[]
  /** Paths relative to the widget extension root (e.g. en.lproj/VoltraWidgets.strings) */
  localizedStringResources: string[]
}

// ============================================================================
// Android Types
// ============================================================================

/**
 * Configuration for a single Android widget
 */
export interface AndroidWidgetConfig {
  /**
   * Unique identifier for the widget
   */
  id: string
  /**
   * Display name shown in the widget picker (same localization rules as iOS `widgets[].displayName`).
   */
  displayName: WidgetLabel
  /**
   * Description shown in the widget picker (same localization rules as iOS `widgets[].description`).
   */
  description: WidgetLabel
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
   * Path to a file that default exports a WidgetVariants object for initial widget state (or a locale map of paths).
   * This will be pre-rendered at build time and bundled into the app.
   */
  initialStatePath?: WidgetInitialStatePath
  /**
   * Configuration for server-driven widget updates.
   * When configured, the widget will periodically fetch new content from a remote server
   * running Voltra SSR, without requiring the user to open the app.
   */
  serverUpdate?: AndroidWidgetServerUpdateConfig
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
 * Configuration for server-driven Android widget updates.
 */
export interface AndroidWidgetServerUpdateConfig {
  /**
   * The URL of the Voltra SSR endpoint that returns widget JSON.
   * The widget ID will be appended as a query parameter.
   * Example: "https://api.example.com/widgets/render"
   */
  url: string
  /**
   * How often the widget should fetch updates, in minutes.
   * Uses WorkManager PeriodicWorkRequest; minimum interval is 15 minutes.
   * @default 60
   */
  intervalMinutes?: number
  /**
   * Whether to show a native refresh button in the top-right corner of the widget.
   * When tapped, triggers an immediate server update.
   * @default false
   */
  refresh?: boolean
}

/**
 * Android-specific plugin configuration
 */
export interface AndroidPluginConfig {
  /**
   * Enable Android notification-related manifest plumbing used by Voltra features
   * such as Live Updates.
   */
  enableNotifications?: boolean
  /**
   * Android home screen widgets
   * Separate from iOS widgets to allow platform-specific configurations
   */
  widgets?: AndroidWidgetConfig[]
}

// ============================================================================
// Plugin Types
// ============================================================================

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
   * Provide an array of font module specifiers, file paths, or directories containing fonts.
   * Supports .ttf, .otf, .woff, and .woff2 formats.
   *
   * This is equivalent to expo-font but for the Live Activity extension.
   * @see https://docs.expo.dev/versions/latest/sdk/font/
   */
  fonts?: string[]
  /**
   * Keychain Access Group for sharing credentials between the main app and widget extension.
   * Required when using server-driven widget updates with authentication.
   * This should match a Keychain Sharing capability group configured in your Apple Developer account.
   * Example: "$(AppIdentifierPrefix)com.example.shared"
   *
   * If not provided and any widget has `serverUpdate` configured, defaults to
   * `$(AppIdentifierPrefix)<bundleIdentifier>` (the app's own keychain access group).
   */
  keychainGroup?: string
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
  enableNotifications?: boolean
  widgets: AndroidWidgetConfig[]
  userImagesPath?: string
  fonts?: string[]
}
