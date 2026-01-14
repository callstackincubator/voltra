import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import type { LiveActivityConfig, WidgetConfig } from '../../../types'
import { generateAssets } from './assets'
import { generateEntitlements } from './entitlements'
import { generateInfoPlist } from './plist'
import { generateSwiftFiles } from './swift'

export interface GenerateWidgetExtensionFilesProps {
  targetName: string
  widgets?: WidgetConfig[]
  groupIdentifier: string
  liveActivity?: LiveActivityConfig
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
  const { targetName, widgets, groupIdentifier, liveActivity } = props

  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const { platformProjectRoot, projectRoot } = config.modRequest
      const targetPath = path.join(platformProjectRoot, targetName)

      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true })
      }

      generateInfoPlist(targetPath)

      generateAssets({ targetPath })

      await generateSwiftFiles({
        targetPath,
        projectRoot,
        widgets,
        supplementalActivityFamilies: liveActivity?.supplementalActivityFamilies,
      })

      generateEntitlements({
        targetPath,
        targetName,
        groupIdentifier,
      })

      return config
    },
  ])
}
