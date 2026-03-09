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

    // Extract version and buildNumber from config, defaulting to Expo defaults
    const version = config.version || '1.0.0'
    const buildNumber = config.ios?.buildNumber || '1'

    // Ensure URL scheme is set for widget deep linking
    config = ensureURLScheme(config)

    // Derive a default keychainGroup from bundle identifier when any widget uses server-driven updates
    const hasServerDrivenWidgets = props?.widgets?.some((w) => w.serverUpdate) ?? false
    const keychainGroup =
      props?.keychainGroup ??
      (hasServerDrivenWidgets ? `$(AppIdentifierPrefix)${config.ios?.bundleIdentifier}` : undefined)

    // Configure iOS main app (Info.plist, entitlements, EAS)
    config = withIOS(config, {
      groupIdentifier: props?.groupIdentifier,
      widgetIds: props?.widgets && props.widgets.length > 0 ? props.widgets.map((w) => w.id) : undefined,
      widgets: props?.widgets,
      keychainGroup,
    })

    // Configure iOS widget extension (files, xcode, podfile, plist, eas)
    config = withIOSWidget(config, {
      targetName,
      bundleIdentifier,
      deploymentTarget,
      widgets: props?.widgets,
      version,
      buildNumber,
      ...(props?.groupIdentifier ? { groupIdentifier: props.groupIdentifier } : {}),
      ...(keychainGroup ? { keychainGroup } : {}),
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
  AndroidWidgetServerUpdateConfig,
  ConfigPluginProps,
  VoltraConfigPlugin,
  WidgetConfig,
  WidgetFamily,
  WidgetServerUpdateConfig,
} from './types'
