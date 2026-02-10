import { IOSConfig } from 'expo/config-plugins'

import { withAndroid } from './android'
import { IOS } from './constants'
import { withIOS, withPushNotifications } from './ios'
import { withIOS as withIOSWidget } from './ios-widget'
import type { VoltraConfigPlugin } from './types'
import { ensureURLScheme } from './utils/urlScheme'
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

  // Configure iOS if bundleIdentifier is available
  if (config.ios?.bundleIdentifier) {
    // Use deploymentTarget from props if provided, otherwise fall back to default
    const deploymentTarget = props.deploymentTarget || IOS.DEPLOYMENT_TARGET
    // Use custom targetName if provided, otherwise fall back to default "{AppName}LiveActivity"
    const targetName = props.targetName || `${IOSConfig.XcodeUtils.sanitizedName(config.name)}LiveActivity`
    const bundleIdentifier = `${config.ios.bundleIdentifier}.${targetName}`

    // Ensure URL scheme is set for widget deep linking
    config = ensureURLScheme(config)

    // Configure iOS main app (Info.plist, entitlements, EAS)
    config = withIOS(config, {
      groupIdentifier: props?.groupIdentifier,
      widgetIds: props?.widgets && props.widgets.length > 0 ? props.widgets.map((w) => w.id) : undefined,
    })

    // Configure iOS widget extension (files, xcode, podfile, plist, eas)
    config = withIOSWidget(config, {
      targetName,
      bundleIdentifier,
      deploymentTarget,
      widgets: props?.widgets,
      ...(props?.groupIdentifier ? { groupIdentifier: props.groupIdentifier } : {}),
      ...(props?.fonts ? { fonts: props.fonts } : {}),
    })
  }

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
