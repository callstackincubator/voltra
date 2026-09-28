import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins'
import * as fs from 'fs'
import * as path from 'path'

import type { IOSDynamicLiveActivityConfig, IOSWidgetConfig } from '../../types'
import { generateAssets } from './assets'
import { generateEntitlements } from './entitlements'
import { generateInfoPlist } from './infoPlist'
import {
  resolveDevelopmentRegion,
  resolveExtensionLocalizations,
  syncExtensionLocalizableStrings,
} from './localization'
import { generateIOSDynamicLiveActivitiesManifest, generateIOSDynamicWidgetsManifest } from './manifest'
import { generateSwiftFiles } from './swift'

export interface GenerateWidgetExtensionFilesProps {
  targetName: string
  widgets?: IOSWidgetConfig[]
  liveActivities?: IOSDynamicLiveActivityConfig[]
  groupIdentifier?: string
  keychainGroup?: string
  version: string
  buildNumber: string
  voltraVersion: string
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
 * - <locale>.lproj/Localizable.strings (declared languages and Edit Widget sheet strings)
 *
 * This should run before configureXcodeProject so the files exist when Xcode project is configured.
 */
export const generateWidgetExtensionFiles: ConfigPlugin<GenerateWidgetExtensionFilesProps> = (config, props) => {
  const { targetName, widgets, liveActivities, groupIdentifier, keychainGroup, version, buildNumber, voltraVersion } =
    props

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

      // Languages the extension declares, mirrored from the app (ADR 0009 §4)
      const localizations = resolveExtensionLocalizations(config, widgets)

      // Generate Info.plist
      generateInfoPlist(targetPath, targetName, version, buildNumber, voltraVersion, localizations)

      // Generate Assets.xcassets and copy user images
      generateAssets({ targetPath })

      // Generate Swift files (widget bundle, initial states)
      await generateSwiftFiles({
        targetPath,
        projectRoot,
        widgets,
        liveActivities,
      })

      // <locale>.lproj/Localizable.strings: Edit Widget sheet strings, and one real resource per
      // declared language. Runs after the gallery strings, which share the .lproj folders.
      syncExtensionLocalizableStrings(targetPath, localizations, widgets, resolveDevelopmentRegion(config))

      // Write the iOS-owned Dynamic Widgets manifest for Metro to consume later.
      generateIOSDynamicWidgetsManifest({
        projectRoot,
        widgets,
      })

      // Dynamic Live Activities have their own Metro manifest so their IDs may overlap with
      // Dynamic Widgets and stale declarations never leak into a later prebuild.
      generateIOSDynamicLiveActivitiesManifest({
        projectRoot,
        liveActivities,
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
