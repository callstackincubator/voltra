import type { ExpoConfig } from 'expo/config'

/**
 * Ensures the main app has a URL scheme set so widgetURL can open it.
 * This is an optional feature for deep linking from widgets.
 *
 * @param config - The Expo config object
 * @returns The modified config with URL scheme ensured
 */
export function ensureURLScheme(config: ExpoConfig): ExpoConfig {
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
