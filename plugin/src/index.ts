import { IOSConfig } from 'expo/config-plugins'

import { IOS } from './constants'
import { withAndroid } from './features/android'
import { withIOS } from './features/ios'
import { withPushNotifications } from './features/pushNotifications'
import type { VoltraConfigPlugin } from './types'
import { ensureURLScheme } from './utils'
import { validateProps } from './validation'

/**
 * Main Voltra config plugin.
 *
 * This plugin configures your Expo app for:
 * - Live Activities (Dynamic Island + Lock Screen)
 * - Home Screen Widgets (iOS and Android)
 * - Push Notifications for Live Activities (optional)
 */
const withVoltra: VoltraConfigPlugin = (config, props = {}) => {
  // Validate props at entry point
  validateProps(props)

  // Use deploymentTarget from props if provided, otherwise fall back to default
  const deploymentTarget = props.deploymentTarget || IOS.DEPLOYMENT_TARGET
  // Use custom targetName if provided, otherwise fall back to default "{AppName}LiveActivity"
  const targetName = props.targetName || `${IOSConfig.XcodeUtils.sanitizedName(config.name)}LiveActivity`
  const bundleIdentifier = `${config.ios?.bundleIdentifier}.${targetName}`

  // Ensure URL scheme is set for widget deep linking
  config = ensureURLScheme(config)

  // Add Live Activities support to main app Info.plist
  config.ios = {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: false,
      // Only add group identifier if provided
      ...(props?.groupIdentifier ? { Voltra_AppGroupIdentifier: props.groupIdentifier } : {}),
      // Store widget IDs in Info.plist for native module to access
      ...(props?.widgets && props.widgets.length > 0 ? { Voltra_WidgetIds: props.widgets.map((w) => w.id) } : {}),
    },
  }

  // Apply iOS configuration (files, xcode, podfile, plist, eas)
  config = withIOS(config, {
    targetName,
    bundleIdentifier,
    deploymentTarget,
    widgets: props?.widgets,
    ...(props?.groupIdentifier ? { groupIdentifier: props.groupIdentifier } : {}),
    ...(props?.fonts ? { fonts: props.fonts } : {}),
  })

  // Apply Android configuration (files, manifest)
  if (props.android) {
    config = withAndroid(config, {
      widgets: props.android.widgets ?? [],
    })
  }

  // Optionally enable push notifications
  if (props.enablePushNotifications) {
    config = withPushNotifications(config)
  }

  return config
}

export default withVoltra

// Re-export public types
export type {
  AndroidPluginConfig,
  AndroidWidgetConfig,
  ConfigPluginProps,
  VoltraConfigPlugin,
  WidgetConfig,
  WidgetFamily,
} from './types'
