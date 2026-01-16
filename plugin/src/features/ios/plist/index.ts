import { ConfigPlugin, InfoPlist, withInfoPlist } from '@expo/config-plugins'
import plist from '@expo/plist'
import { readFileSync, writeFileSync } from 'fs'
import { join as joinPath } from 'path'

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
export const configureMainAppPlist: ConfigPlugin<ConfigureMainAppPlistProps> = (
  expoConfig,
  { targetName, groupIdentifier }
) =>
  withInfoPlist(expoConfig, (plistConfig) => {
    const scheme = typeof expoConfig.scheme === 'string' ? expoConfig.scheme : expoConfig.ios?.bundleIdentifier

    if (scheme) {
      const targetPath = joinPath(plistConfig.modRequest.platformProjectRoot, targetName)
      const filePath = joinPath(targetPath, 'Info.plist')
      const content = plist.parse(readFileSync(filePath, 'utf8')) as InfoPlist

      // WidgetKit extensions must NOT declare NSExtensionPrincipalClass/MainStoryboard.
      // The @main WidgetBundle in Swift is the entry point.
      const ext = (content as any).NSExtension as Record<string, any> | undefined
      if (ext) {
        delete ext.NSExtensionPrincipalClass
        delete ext.NSExtensionMainStoryboard
      }

      content.CFBundleURLTypes = [
        {
          CFBundleURLSchemes: [scheme],
        },
      ]

      // Only set group identifier if provided
      if (groupIdentifier) {
        ;(content as any)['Voltra_AppGroupIdentifier'] = groupIdentifier
      }

      writeFileSync(filePath, plist.build(content))
    }

    return plistConfig
  })
