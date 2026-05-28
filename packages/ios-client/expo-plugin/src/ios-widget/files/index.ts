import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import type { IOSWidgetConfig } from '../../types'
import { logger } from '../../utils/logger'
import { generateAssets } from './assets'
import { generateEntitlements } from './entitlements'
import { generateInfoPlist } from './infoPlist'
import { generateSwiftFiles } from './swift'

export interface GenerateWidgetExtensionFilesProps {
  targetName: string
  widgets?: IOSWidgetConfig[]
  groupIdentifier?: string
  keychainGroup?: string
  version: string
  buildNumber: string
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
function copyRendererBundle(targetPath: string, projectRoot: string): void {
  const dest = path.join(targetPath, 'ios-renderer.js')
  const candidates = [
    // Standard npm install in the project
    path.join(projectRoot, 'node_modules', '@use-voltra', 'ios-renderer', 'bundle', 'ios-renderer.js'),
    // Monorepo: workspace root node_modules (one level above the app)
    path.join(projectRoot, '..', 'node_modules', '@use-voltra', 'ios-renderer', 'bundle', 'ios-renderer.js'),
    // Monorepo: packages/ built locally (bundle/ output)
    path.join(projectRoot, '..', 'packages', 'ios-renderer', 'bundle', 'ios-renderer.js'),
  ]

  for (const src of candidates) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest)
      logger.info('Copied ios-renderer.js to widget extension target')
      return
    }
  }

  logger.warn(
    'ios-renderer.js not found — run `npm run build:bundle -w @use-voltra/ios-renderer` then re-run prebuild'
  )
}

export const generateWidgetExtensionFiles: ConfigPlugin<GenerateWidgetExtensionFilesProps> = (config, props) => {
  const { targetName, widgets, groupIdentifier, keychainGroup, version, buildNumber } = props

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
      generateInfoPlist(targetPath, targetName, version, buildNumber)

      // Generate Assets.xcassets and copy user images
      generateAssets({ targetPath })

      // Copy ios-renderer.js bundle when any widget uses AppIntent (iOS 17+)
      if (widgets?.some((w) => w.appIntent)) {
        copyRendererBundle(targetPath, projectRoot)
      }

      // Generate Swift files (widget bundle, initial states)
      await generateSwiftFiles({
        targetPath,
        projectRoot,
        widgets,
      })

      // Generate entitlements file (may be empty if no groupIdentifier or keychainGroup)
      generateEntitlements({
        targetPath,
        targetName,
        groupIdentifier,
        keychainGroup,
      })

      return config
    },
  ])
}
