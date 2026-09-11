import type { ExpoConfig } from 'expo/config'

function getConfiguredSchemes(config: ExpoConfig): string[] {
  const schemes = [config.scheme, (config.ios as { scheme?: string | string[] } | undefined)?.scheme].flat()

  return schemes.filter((scheme): scheme is string => typeof scheme === 'string')
}

/**
 * Ensures the main app has a URL scheme set so widgetURL can open it.
 * This is an optional feature for deep linking from widgets.
 *
 * @param config - The Expo config object
 * @returns The modified config with URL scheme ensured
 */
export function ensureURLScheme(config: ExpoConfig): ExpoConfig {
  const existingInfoPlist = config.ios?.infoPlist
  const existingTypes = existingInfoPlist?.CFBundleURLTypes as any[] | undefined

  // Expo's own withScheme fills CFBundleURLTypes from `scheme` / `ios.scheme` and always appends
  // ios.bundleIdentifier, but it skips the app entirely once ios.infoPlist.CFBundleURLTypes is set
  // (createInfoPlistPluginWithPropertyGuard). Writing the key here when the app hasn't set it
  // therefore drops every configured scheme instead of adding one. Only top up a list the app owns.
  if (!existingTypes) {
    return config
  }

  const configuredSchemes = getConfiguredSchemes(config)
  const wantedSchemes = configuredSchemes.length > 0 ? configuredSchemes : [config.ios?.bundleIdentifier]

  const missingSchemes = wantedSchemes.filter(
    (scheme): scheme is string =>
      !!scheme &&
      !existingTypes.some((t) => Array.isArray(t?.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme))
  )

  if (missingSchemes.length === 0) {
    return config
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...existingInfoPlist,
        CFBundleURLTypes: [
          ...existingTypes,
          ...missingSchemes.map((scheme) => ({
            CFBundleURLSchemes: [scheme],
          })),
        ],
      },
    },
  }
}
