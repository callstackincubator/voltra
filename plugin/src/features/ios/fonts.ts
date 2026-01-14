/**
 * Font configuration for Live Activity extension.
 *
 * This code is adapted from expo-font to support custom fonts in Live Activities.
 * @see https://github.com/expo/expo/tree/main/packages/expo-font/plugin
 *
 * I would love to reuse the existing expo-font infrastructure, but it's not that easy to do. I'll most likely revisit it later.
 */

import { type ConfigPlugin, type InfoPlist, IOSConfig, withXcodeProject } from '@expo/config-plugins'
import plist from '@expo/plist'
import type { ExpoConfig } from 'expo/config'
import { readFileSync, writeFileSync } from 'fs'
import * as fs from 'fs/promises'
import * as path from 'path'

import { logger } from '../../utils'

const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

/**
 * Plugin that adds custom fonts to the Live Activity extension.
 *
 * @param config - The Expo config
 * @param fonts - Array of font file paths or directories
 * @param targetName - Name of the Live Activity extension target
 * @returns Modified config
 */
export const withFonts: ConfigPlugin<{ fonts: string[]; targetName: string }> = (config, { fonts, targetName }) => {
  if (!fonts || fonts.length === 0) {
    return config
  }

  config = addFontsToTarget(config, fonts, targetName)
  config = addFontsToPlist(config, fonts, targetName)
  return config
}

/**
 * Adds font files to the Live Activity extension target.
 * This ensures fonts are bundled with the extension and accessible at runtime.
 */
function addFontsToTarget(config: ExpoConfig, fonts: string[], targetName: string) {
  return withXcodeProject(config, async (config) => {
    const resolvedFonts = await resolveFontPaths(fonts, config.modRequest.projectRoot)
    const project = config.modResults
    const platformProjectRoot = config.modRequest.platformProjectRoot
    const targetUuid = project.findTargetKey(targetName)

    if (targetUuid == null) {
      throw new Error(`Target ${targetName} not found in Xcode project. Report this issue to the Voltra team.`)
    }

    IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'VoltraResources')

    for (const font of resolvedFonts) {
      const fontPath = path.relative(platformProjectRoot, font)

      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: fontPath,
        groupName: 'VoltraResources',
        project,
        isBuildFile: true,
        verbose: true,
        targetUuid,
      })

      logger.info(`Added font file: ${path.basename(font)}`)
    }

    return config
  })
}

/**
 * Adds font filenames to the Live Activity extension's Info.plist UIAppFonts array.
 * This makes iOS aware of the custom fonts and allows them to be used in SwiftUI.
 */
function addFontsToPlist(config: ExpoConfig, fonts: string[], targetName: string) {
  return withXcodeProject(config, async (config) => {
    const resolvedFonts = await resolveFontPaths(fonts, config.modRequest.projectRoot)
    const platformProjectRoot = config.modRequest.platformProjectRoot

    // Read the Live Activity extension's Info.plist directly
    const targetPath = path.join(platformProjectRoot, targetName)
    const infoPlistPath = path.join(targetPath, 'Info.plist')

    try {
      const plistContent = plist.parse(readFileSync(infoPlistPath, 'utf8')) as InfoPlist

      // Get existing fonts or initialize empty array
      const existingFonts = getUIAppFonts(plistContent)

      // Add new fonts
      const fontList = resolvedFonts.map((font) => path.basename(font))
      const allFonts = [...existingFonts, ...fontList]
      plistContent.UIAppFonts = Array.from(new Set(allFonts))

      // Write back to file
      writeFileSync(infoPlistPath, plist.build(plistContent))

      logger.info(`Added ${fontList.length} font(s) to ${targetName} Info.plist`)
    } catch (error) {
      logger.warn(`Could not update Info.plist for fonts: ${error}`)
    }

    return config
  })
}

/**
 * Retrieves existing UIAppFonts from Info.plist.
 *
 * @param infoPlist - Info.plist object
 * @returns Array of font filenames
 */
function getUIAppFonts(infoPlist: InfoPlist): string[] {
  const fonts = infoPlist['UIAppFonts']
  if (fonts != null && Array.isArray(fonts) && fonts.every((font) => typeof font === 'string')) {
    return fonts as string[]
  }
  return []
}

/**
 * Resolves font file paths from the provided array of paths or directories.
 *
 * This function:
 * - Resolves relative paths to absolute paths
 * - Expands directories to individual font files
 * - Filters to only include valid font file extensions
 *
 * @param fonts - Array of font file paths or directories
 * @param projectRoot - Project root directory
 * @returns Promise resolving to array of absolute font file paths
 */
async function resolveFontPaths(fonts: string[], projectRoot: string): Promise<string[]> {
  const promises = fonts.map(async (p) => {
    const resolvedPath = path.resolve(projectRoot, p)

    try {
      const stat = await fs.stat(resolvedPath)

      if (stat.isDirectory()) {
        const dir = await fs.readdir(resolvedPath)
        return dir.map((file) => path.join(resolvedPath, file))
      }
      return [resolvedPath]
    } catch {
      logger.warn(`Could not resolve font path: ${resolvedPath}`)
      return []
    }
  })

  const results = await Promise.all(promises)
  return results.flat().filter((p) => FONT_EXTENSIONS.some((ext) => p.endsWith(ext)))
}
