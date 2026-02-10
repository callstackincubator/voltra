import type { ExpoConfig } from 'expo/config'

import { configureEas } from './eas'
import { configureEntitlements } from './entitlements'
import { configureInfoPlist } from './infoPlist'

export interface IOSConfigProps {
  groupIdentifier?: string
  widgetIds?: string[]
}

/**
 * Main iOS app configuration.
 *
 * This configures the main app (not the widget extension) for:
 * - Live Activities support (Info.plist)
 * - App groups for widget communication (entitlements)
 * - EAS build configuration
 */
export function withIOS(config: ExpoConfig, props: IOSConfigProps): ExpoConfig {
  // Configure Info.plist
  config = configureInfoPlist(config, {
    groupIdentifier: props.groupIdentifier,
    widgetIds: props.widgetIds,
  })

  // Configure entitlements
  config = configureEntitlements(config, {
    groupIdentifier: props.groupIdentifier,
  })

  // Configure EAS
  config = configureEas(config, {
    groupIdentifier: props.groupIdentifier,
  })

  return config
}

// Re-export for convenience
export { withPushNotifications } from './pushNotifications'
