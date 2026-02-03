import { ConfigPlugin, IOSConfig, withPlugins } from 'expo/config-plugins'

// Android plugins
import { generateAndroidFiles } from './android/files'
import { configureAndroidWidgetReceivers } from './android/manifest'
import { IOS } from './constants'
// iOS main app plugins
import { configureIOSMainAppEntitlements } from './ios/entitlements'
import { configureIOSMainAppInfoPlist } from './ios/infoPlist'
import { configureIOSPushNotifications } from './ios/pushNotifications'
// iOS target plugins
import { configureTargetEASBuild } from './ios-target/eas'
import { generateTargetFiles } from './ios-target/files'
import { configureTargetFonts } from './ios-target/fonts'
import { configureTargetInfoPlist } from './ios-target/infoPlist'
import { configureTargetPodfile } from './ios-target/podfile'
import { configureTargetXcodeProject } from './ios-target/xcode'
import type { VoltraConfigPlugin } from './types'
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

  // Calculate derived values
  const deploymentTarget = props.deploymentTarget || IOS.DEPLOYMENT_TARGET
  const targetName = props.targetName || `${IOSConfig.XcodeUtils.sanitizedName(config.name)}LiveActivity`
  const bundleIdentifier = `${config.ios?.bundleIdentifier}.${targetName}`

  // Phase 1: Configure iOS main app (independent plugins)
  const iosMainAppPlugins: [ConfigPlugin<any>, any][] = [
    [configureIOSMainAppInfoPlist, { widgets: props.widgets, groupIdentifier: props.groupIdentifier }],
    ...(props.groupIdentifier
      ? [[configureIOSMainAppEntitlements, { groupIdentifier: props.groupIdentifier }] as [ConfigPlugin<any>, any]]
      : []),
    ...(props.enablePushNotifications ? [[configureIOSPushNotifications, {}] as [ConfigPlugin<any>, any]] : []),
  ]
  config = withPlugins(config, iosMainAppPlugins)

  // Phase 2: Configure iOS widget extension target (sequential dependencies - reverse execution order)
  const iosTargetPlugins: [ConfigPlugin<any>, any][] = [
    [generateTargetFiles, { targetName, widgets: props.widgets, groupIdentifier: props.groupIdentifier }],
    ...(props.fonts ? [[configureTargetFonts, { fonts: props.fonts, targetName }] as [ConfigPlugin<any>, any]] : []),
    [configureTargetXcodeProject, { targetName, bundleIdentifier, deploymentTarget }],
    [configureTargetPodfile, { targetName }],
    [configureTargetInfoPlist, { targetName, groupIdentifier: props.groupIdentifier }],
    [configureTargetEASBuild, { targetName, bundleIdentifier, groupIdentifier: props.groupIdentifier }],
  ]
  config = withPlugins(config, iosTargetPlugins)

  // Phase 3: Configure Android (if provided)
  if (props.android) {
    const androidPlugins: [ConfigPlugin<any>, any][] = [
      [generateAndroidFiles, { widgets: props.android.widgets, userImagesPath: props.android.userImagesPath }],
      [configureAndroidWidgetReceivers, { widgets: props.android.widgets }],
    ]
    config = withPlugins(config, androidPlugins)
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
