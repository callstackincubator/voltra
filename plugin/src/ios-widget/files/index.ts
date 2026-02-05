import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import type { WidgetConfig } from '../../types'
import { generateAssets } from './assets'
import { generateEntitlements } from './entitlements'
import { generateInfoPlist } from './infoPlist'
import { generateSwiftFiles } from './swift'

export interface GenerateWidgetExtensionFilesProps {
  targetName: string
  widgets?: WidgetConfig[]
  groupIdentifier?: string
}

/**
 * Plugin step that generates all widget extension files.
 *
 * This creates:
 * - Info.plist (required extension manifest)
 * - Assets.xcassets/ (asset catalog with user images)
 * - VoltraWidgetBundle.swift (widget bundle definition)
 * - VoltraWidgetInitialStates.swift (pre-rendered widget states)
 * - {targetName}.entitlements (entitlements file)
 *
 * This should run before configureXcodeProject so the files exist when Xcode project is configured.
 */
export const generateWidgetExtensionFiles: ConfigPlugin<GenerateWidgetExtensionFilesProps> = (config, props) => {
  const { targetName, widgets, groupIdentifier } = props

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      if (config.modRequest.introspect) {
        return config
      }

      const { platformProjectRoot, projectRoot } = config.modRequest
      const targetPath = path.join(platformProjectRoot, targetName)

      // Ensure target directory exists
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true })
      }

      // Generate Info.plist
      generateInfoPlist(targetPath)

      // Generate Assets.xcassets and copy user images
      generateAssets({ targetPath })

      // Generate Swift files (widget bundle, initial states)
      await generateSwiftFiles({
        targetPath,
        projectRoot,
        widgets,
      })

      // Generate entitlements file (may be empty if no groupIdentifier)
      generateEntitlements({
        targetPath,
        targetName,
        groupIdentifier,
      })

      return config
    },
  ])
}
