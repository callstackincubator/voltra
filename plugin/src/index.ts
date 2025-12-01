import { IOSConfig, withPlugins } from 'expo/config-plugins'

import type { VoltraConfigPlugin } from './types'
import { withConfig } from './withConfig'
import withPlist from './withPlist'
import { withPodfile } from './withPodfile'
import { withPushNotifications } from './withPushNotifications'
import { withWidgetExtensionEntitlements } from './withWidgetExtensionEntitlements'
import { withXcode } from './withXcode'

const withVoltra: VoltraConfigPlugin = (config, props) => {
  const deploymentTarget = '17.0'
  const targetName = `${IOSConfig.XcodeUtils.sanitizedName(config.name)}LiveActivity`
  const bundleIdentifier = `${config.ios?.bundleIdentifier}.${targetName}`

  config.ios = {
    ...config.ios,
    infoPlist: {
      ...config.ios?.infoPlist,
      NSSupportsLiveActivities: true,
      NSSupportsLiveActivitiesFrequentUpdates: false,
      ...(props?.groupIdentifier ? { VoltraUI_AppGroupIdentifier: props.groupIdentifier } : {}),
      // Ensure the main app has a URL scheme set so widgetURL can open it (optional feature)
      ...(function ensureURLScheme(existing: Record<string, any>) {
        const scheme =
          typeof (config as any).scheme === 'string' ? (config as any).scheme : config.ios?.bundleIdentifier
        if (!scheme) return {}
        const existingTypes = (existing.CFBundleURLTypes as any[]) || []
        const hasScheme = existingTypes.some(
          (t) => Array.isArray(t?.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme)
        )
        if (hasScheme) return {}
        return {
          CFBundleURLTypes: [
            ...existingTypes,
            {
              CFBundleURLSchemes: [scheme],
            },
          ],
        }
      })(config.ios?.infoPlist || {}),
    },
  }

  config = withPlugins(config, [
    [withPlist, { targetName, groupIdentifier: props?.groupIdentifier }],
    [
      withXcode,
      {
        targetName,
        bundleIdentifier,
        deploymentTarget,
      },
    ],
    [withWidgetExtensionEntitlements, { targetName, groupIdentifier: props?.groupIdentifier }],
    [withConfig, { targetName, bundleIdentifier, groupIdentifier: props?.groupIdentifier }],
    [withPodfile, { targetName }],
  ])

  if (props?.enablePushNotifications) {
    config = withPushNotifications(config)
  }

  return config
}

export default withVoltra
