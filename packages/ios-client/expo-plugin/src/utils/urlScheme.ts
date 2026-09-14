import type { ExpoConfig } from 'expo/config'

type URLType = { CFBundleURLSchemes?: unknown }

/**
 * The URL schemes the app is configured with: every `scheme` and `ios.scheme` value (string or
 * array), or the bundle identifier when neither is set.
 */
export function getAppURLSchemes(config: ExpoConfig): string[] {
  const configured = [config.scheme, (config.ios as { scheme?: string | string[] } | undefined)?.scheme]
    .flat()
    .filter((scheme): scheme is string => typeof scheme === 'string' && scheme.length > 0)

  if (configured.length > 0) {
    return [...new Set(configured)]
  }

  return config.ios?.bundleIdentifier ? [config.ios.bundleIdentifier] : []
}

/**
 * Appends a URL type for every scheme not already listed. Returns `types` itself when nothing is
 * missing.
 */
export function appendMissingURLSchemes<T extends URLType>(
  types: T[],
  schemes: string[]
): (T | { CFBundleURLSchemes: string[] })[] {
  const missingSchemes = schemes.filter(
    (scheme) => !types.some((t) => Array.isArray(t?.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme))
  )

  if (missingSchemes.length === 0) {
    return types
  }

  return [...types, ...missingSchemes.map((scheme) => ({ CFBundleURLSchemes: [scheme] }))]
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
  const existingTypes = existingInfoPlist?.CFBundleURLTypes as URLType[] | undefined

  // Expo's own withScheme fills CFBundleURLTypes from `scheme` / `ios.scheme` and always appends
  // ios.bundleIdentifier, but it skips the app entirely once ios.infoPlist.CFBundleURLTypes is set
  // (createInfoPlistPluginWithPropertyGuard). Writing the key here when the app hasn't set it
  // therefore drops every configured scheme instead of adding one. Only top up a list the app owns.
  if (!existingTypes) {
    return config
  }

  const types = appendMissingURLSchemes(existingTypes, getAppURLSchemes(config))

  if (types === existingTypes) {
    return config
  }

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...existingInfoPlist,
        CFBundleURLTypes: types,
      },
    },
  }
}
