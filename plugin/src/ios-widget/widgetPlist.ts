import { ConfigPlugin, InfoPlist, withDangerousMod } from '@expo/config-plugins'
import plist from '@expo/plist'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join as joinPath } from 'path'

import { logger } from '../utils/logger'

export interface ConfigureMainAppPlistProps {
  targetName: string
  groupIdentifier?: string
}

/**
 * Plugin step that configures the Info.plist files.
 *
 * This:
 * - Updates the widget extension's Info.plist with URL schemes
 * - Removes incompatible NSExtension keys for WidgetKit
 * - Adds group identifier if configured
 */
export const configureWidgetExtensionPlist: ConfigPlugin<ConfigureMainAppPlistProps> = (
  expoConfig,
  { targetName, groupIdentifier }
) =>
  withDangerousMod(expoConfig, [
    'ios',
    async (config) => {
      if (config.modRequest.introspect) {
        return config
      }

      const scheme = typeof expoConfig.scheme === 'string' ? expoConfig.scheme : expoConfig.ios?.bundleIdentifier

      if (scheme) {
        const targetPath = joinPath(config.modRequest.platformProjectRoot, targetName)
        const filePath = joinPath(targetPath, 'Info.plist')
        if (!existsSync(filePath)) {
          logger.warn(`Widget Info.plist not found at ${filePath}, skipping widget plist updates`)
          return config
        }

        const content = plist.parse(readFileSync(filePath, 'utf8')) as InfoPlist

        // WidgetKit extensions must NOT declare NSExtensionPrincipalClass/MainStoryboard.
        // The @main WidgetBundle in Swift is the entry point.
        const ext = (content as any).NSExtension as Record<string, any> | undefined
        if (ext) {
          delete ext.NSExtensionPrincipalClass
          delete ext.NSExtensionMainStoryboard
        }

        // Keep URL schemes in the widget extension so Live Activity links can be resolved
        // from relative to absolute URLs (see VoltraDeepLinkResolver.swift).
        const existingTypes = (content.CFBundleURLTypes as any[]) || []
        const hasScheme = existingTypes.some(
          (t) => Array.isArray(t?.CFBundleURLSchemes) && t.CFBundleURLSchemes.includes(scheme)
        )
        if (!hasScheme) {
          content.CFBundleURLTypes = [
            ...existingTypes,
            {
              CFBundleURLSchemes: [scheme],
            },
          ]
        } else {
          content.CFBundleURLTypes = existingTypes
        }

        // Only set group identifier if provided
        if (groupIdentifier) {
          ;(content as any)['Voltra_AppGroupIdentifier'] = groupIdentifier
        }

        writeFileSync(filePath, plist.build(content))
      }

      return config
    },
  ])
