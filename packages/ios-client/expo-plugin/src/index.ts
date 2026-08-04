import { IOSConfig } from 'expo/config-plugins'
import { createRequire } from 'node:module'
import path from 'node:path'

import { IOS } from './constants'
import { withIOS, withPushNotifications } from './ios'
import { withIOS as withIOSWidget } from './ios-widget'
import type { VoltraIosConfigPlugin } from './types'
import { ensureURLScheme } from './utils/urlScheme'
import { validateIOSConfigPluginProps } from './validation'

/**
 * Voltra iOS Expo config plugin.
 *
 * Configures Live Activities, the widget extension, and optional push-to-start support.
 */
const withVoltraIos: VoltraIosConfigPlugin = (config, props = {}) => {
  const projectRoot = (config as { modRequest?: { projectRoot?: string } }).modRequest?.projectRoot
  validateIOSConfigPluginProps(props, projectRoot)

  const requireFromProject = createRequire(path.join(projectRoot ?? process.cwd(), 'package.json'))
  const iosClientPackage = requireFromProject('@use-voltra/ios-client/package.json') as { version?: unknown }
  if (typeof iosClientPackage.version !== 'string') {
    throw new Error('Could not determine the installed @use-voltra/ios-client version')
  }
  const voltraVersion = iosClientPackage.version

  const iosBundleIdentifier = config.ios?.bundleIdentifier
  if (!iosBundleIdentifier) {
    throw new Error(
      'The Voltra iOS config plugin requires "expo.ios.bundleIdentifier" to be set in the app config — ' +
        'it derives the widget extension bundle identifier from it. ' +
        'Set "ios.bundleIdentifier" (e.g. "com.example.app") in app.json or app.config.(js|ts) and run prebuild again.'
    )
  }

  const deploymentTarget = props.deploymentTarget || IOS.DEPLOYMENT_TARGET
  const targetName = props.targetName || `${IOSConfig.XcodeUtils.sanitizedName(config.name)}LiveActivity`
  const bundleIdentifier = `${iosBundleIdentifier}.${targetName}`
  const version = config.version || '1.0.0'
  const buildNumber = config.ios?.buildNumber || '1'

  config = ensureURLScheme(config)

  const hasServerDrivenWidgets = props.widgets?.some((w) => w.serverUpdate) ?? false
  const keychainGroup =
    props.keychainGroup ?? (hasServerDrivenWidgets ? `$(AppIdentifierPrefix)${iosBundleIdentifier}` : undefined)

  config = withIOS(config, {
    groupIdentifier: props.groupIdentifier,
    widgetIds: props.widgets && props.widgets.length > 0 ? props.widgets.map((w) => w.id) : undefined,
    widgets: props.widgets,
    liveActivities: props.liveActivities,
    keychainGroup,
    voltraVersion,
  })

  config = withIOSWidget(config, {
    targetName,
    bundleIdentifier,
    deploymentTarget,
    widgets: props.widgets,
    liveActivities: props.liveActivities,
    version,
    buildNumber,
    voltraVersion,
    ...(props.groupIdentifier ? { groupIdentifier: props.groupIdentifier } : {}),
    ...(keychainGroup ? { keychainGroup } : {}),
    ...(props.fonts ? { fonts: props.fonts } : {}),
  })

  if (props.enablePushNotifications) {
    config = withPushNotifications(config)
  }

  return config
}

export default withVoltraIos

export type {
  IOSConfigPluginProps,
  IOSDynamicLiveActivityConfig,
  IOSMainAppPluginProps,
  IOSWidgetConfig,
  IOSWidgetExtensionFiles,
  IOSWidgetExtensionPluginProps,
  IOSWidgetFamily,
  IOSWidgetServerUpdateConfig,
  VoltraIosConfigPlugin,
} from './types'
