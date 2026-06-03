import { IOSConfig } from 'expo/config-plugins'

import { IOS } from './constants'
import { withIOS, withPushNotifications } from './ios'
import { withIOS as withIOSWidget } from './ios-widget'
import type { IOSConfigPluginProps, VoltraIosConfigPlugin } from './types'
import { ensureURLScheme } from './utils/urlScheme'
import { validateIOSConfigPluginProps } from './validation'

/**
 * Voltra iOS Expo config plugin.
 *
 * Configures Live Activities, the widget extension, and optional push-to-start support.
 */
const withVoltraIos: VoltraIosConfigPlugin = (config, props = {}) => {
  validateIOSConfigPluginProps(props)

  const iosBundleIdentifier = config.ios?.bundleIdentifier
  if (!iosBundleIdentifier) {
    return config
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
    keychainGroup,
  })

  config = withIOSWidget(config, {
    targetName,
    bundleIdentifier,
    deploymentTarget,
    widgets: props.widgets,
    version,
    buildNumber,
    clientWidgetHotReload: props.clientWidgetHotReload ?? false,
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
  IOSMainAppPluginProps,
  IOSWidgetConfig,
  IOSWidgetExtensionFiles,
  IOSWidgetExtensionPluginProps,
  IOSWidgetFamily,
  IOSWidgetServerUpdateConfig,
  VoltraIosConfigPlugin,
} from './types'
