import { ConfigPlugin, InfoPlist, withDangerousMod } from '@expo/config-plugins'
import plist from '@expo/plist'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join as joinPath } from 'path'

import type { WidgetConfig } from '../types'
import { logger } from '../utils/logger'

export interface ConfigureMainAppPlistProps {
  targetName: string
  groupIdentifier?: string
  widgets?: WidgetConfig[]
  keychainGroup?: string
}

/**
 * Plugin step that configures the Info.plist files.
 *
 * This:
 * - Updates the widget extension's Info.plist with URL schemes
 * - Removes incompatible NSExtension keys for WidgetKit
 * - Adds group identifier if configured
 * - Adds server update URLs and intervals for server-driven widgets
 * - Adds Keychain group for shared credential access
 */
export const configureWidgetExtensionPlist: ConfigPlugin<ConfigureMainAppPlistProps> = (
  expoConfig,
  { targetName, groupIdentifier, widgets, keychainGroup }
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

        // Configure server update URLs and intervals for widgets with serverUpdate
        if (widgets && widgets.length > 0) {
          const serverUrls: Record<string, string> = {}
          const serverIntervals: Record<string, number> = {}

          for (const widget of widgets) {
            if (widget.serverUpdate) {
              serverUrls[widget.id] = widget.serverUpdate.url
              serverIntervals[widget.id] = widget.serverUpdate.intervalMinutes ?? 15
            }
          }

          if (Object.keys(serverUrls).length > 0) {
            ;(content as any)['Voltra_WidgetServerUrls'] = serverUrls
            ;(content as any)['Voltra_WidgetServerIntervals'] = serverIntervals
          }
        }

        // Add Keychain group for shared credential access
        if (keychainGroup) {
          ;(content as any)['Voltra_KeychainGroup'] = keychainGroup
        }

        writeFileSync(filePath, plist.build(content))
      }

      return config
    },
  ])
