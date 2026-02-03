import type { ConfigPlugin } from '@expo/config-plugins'
import type { ExpoConfig } from 'expo/config'

import type { WidgetConfig } from '../types'

export interface ConfigureIOSMainAppInfoPlistProps {
  widgets?: WidgetConfig[]
  groupIdentifier?: string
}

/**
 * Ensures the main app has a URL scheme set so widgetURL can open it.
 * This is an optional feature for deep linking from widgets.
 */
function ensureURLScheme(config: ExpoConfig): ExpoConfig {
  const scheme = typeof (config as any).scheme === 'string' ? (config as any).scheme : config.ios?.bundleIdentifier

  if (!scheme) {
    return config
  }

  const existingInfoPlist = config.ios?.infoPlist || {}
  const existingTypes = (existingInfoPlist.CFBundleURLTypes as any[]) || []

  // Check if scheme already exists
  const hasScheme = existingTypes.some(
    (t) => Array.isArray(t?.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme)
  )

  if (hasScheme) {
    return config
  }

  // Add the URL scheme
  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...existingInfoPlist,
        CFBundleURLTypes: [
          ...existingTypes,
          {
            CFBundleURLSchemes: [scheme],
          },
        ],
      },
    },
  }
}

/**
 * Plugin that configures the iOS main app's Info.plist for Live Activities and widgets.
 *
 * This:
 * - Enables Live Activities support flags
 * - Adds app group identifier (if provided)
 * - Stores widget IDs for native module access
 * - Ensures URL scheme for widget deep linking
 */
export const configureIOSMainAppInfoPlist: ConfigPlugin<ConfigureIOSMainAppInfoPlistProps> = (
  config,
  { widgets, groupIdentifier }
) => {
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
      ...(groupIdentifier ? { Voltra_AppGroupIdentifier: groupIdentifier } : {}),
      // Store widget IDs in Info.plist for native module to access
      ...(widgets && widgets.length > 0 ? { Voltra_WidgetIds: widgets.map((w) => w.id) } : {}),
    },
  }

  return config
}
