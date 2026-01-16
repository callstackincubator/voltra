import { ConfigPlugin } from '@expo/config-plugins'

import { addApplicationGroupsEntitlement, getWidgetExtensionEntitlements } from '../files/entitlements'

export interface ConfigureEasBuildProps {
  bundleIdentifier: string
  targetName: string
  groupIdentifier?: string
}

/**
 * Plugin step that configures EAS build settings for the widget extension.
 *
 * This:
 * - Adds the widget extension to the EAS build experimental iOS appExtensions
 * - Configures entitlements for both the extension and main app
 */
export const configureEasBuild: ConfigPlugin<ConfigureEasBuildProps> = (
  config,
  { bundleIdentifier, targetName, groupIdentifier }
) => {
  let configIndex: null | number = null

  // Check if extension already exists
  config.extra?.eas?.build?.experimental?.ios?.appExtensions?.forEach((ext: any, index: number) => {
    if (ext.targetName === targetName) {
      configIndex = index
    }
  })

  // Add extension if not already present
  if (configIndex === null) {
    config.extra = {
      ...config.extra,
      eas: {
        ...config.extra?.eas,
        build: {
          ...config.extra?.eas?.build,
          experimental: {
            ...config.extra?.eas?.build?.experimental,
            ios: {
              ...config.extra?.eas?.build?.experimental?.ios,
              appExtensions: [
                ...(config.extra?.eas?.build?.experimental?.ios?.appExtensions ?? []),
                {
                  targetName,
                  bundleIdentifier,
                },
              ],
            },
          },
        },
      },
    }
    configIndex = (config.extra?.eas?.build?.experimental?.ios?.appExtensions?.length ?? 1) - 1
  }

  // Configure entitlements (may be empty if no groupIdentifier)
  if (configIndex != null && config.extra) {
    const widgetsExtensionConfig = config.extra.eas.build.experimental.ios.appExtensions[configIndex]

    widgetsExtensionConfig.entitlements = {
      ...widgetsExtensionConfig.entitlements,
      ...getWidgetExtensionEntitlements(groupIdentifier),
    }

    if (groupIdentifier) {
      config.ios = {
        ...config.ios,
        entitlements: {
          ...addApplicationGroupsEntitlement(config.ios?.entitlements ?? {}, groupIdentifier),
        },
      }
    }
  }

  return config
}
