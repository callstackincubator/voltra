import type { ExpoConfig } from 'expo/config'

import { configureEas } from './eas'
import { configureEntitlements } from './entitlements'
import { configureInfoPlist } from './infoPlist'

export interface IOSConfigProps {
  groupIdentifier?: string
  widgetIds?: string[]
  widgets?: import('../types').IOSWidgetConfig[]
  keychainGroup?: string
  /** Track 5 — when true, plugin adds `remote-notification` to the main app's
   *  UIBackgroundModes so iOS can wake the host app for silent push reloads. */
  clientWidgetHotReload?: boolean
}

/**
 * Main iOS app configuration.
 *
 * This configures the main app (not the widget extension) for:
 * - Live Activities support (Info.plist)
 * - App groups for widget communication (entitlements)
 * - Keychain sharing for widget server credentials (entitlements)
 * - EAS build configuration
 */
export function withIOS(config: ExpoConfig, props: IOSConfigProps): ExpoConfig {
  // Configure Info.plist
  config = configureInfoPlist(config, {
    groupIdentifier: props.groupIdentifier,
    widgetIds: props.widgetIds,
    widgets: props.widgets,
    keychainGroup: props.keychainGroup,
    clientWidgetHotReload: props.clientWidgetHotReload,
  })

  // Configure entitlements
  config = configureEntitlements(config, {
    groupIdentifier: props.groupIdentifier,
    keychainGroup: props.keychainGroup,
  })

  // Configure EAS
  config = configureEas(config, {
    groupIdentifier: props.groupIdentifier,
  })

  return config
}

// Re-export for convenience
export { withPushNotifications } from './pushNotifications'
