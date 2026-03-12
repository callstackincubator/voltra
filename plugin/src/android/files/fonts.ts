/**
 * Font configuration for Android widgets.
 *
 * Copies custom font files to the Android assets/fonts/ directory
 * so they can be loaded by TextBitmapRenderer via Typeface.createFromAsset().
 */

import * as fs from 'fs'
import * as path from 'path'

import { logger } from '../../utils/logger'

const FONT_EXTENSIONS = ['.ttf', '.otf']

export interface CopyAndroidFontsOptions {
  platformProjectRoot: string
  projectRoot: string
  fonts: string[]
}

/**
 * Copies custom font files to android/app/src/main/assets/fonts/.
 *
 * Resolves each path relative to the project root.
 * If a path points to a directory, all .ttf/.otf files inside it are copied.
 */
export async function copyAndroidFonts(options: CopyAndroidFontsOptions): Promise<void> {
  const { platformProjectRoot, projectRoot, fonts } = options

  if (!fonts || fonts.length === 0) {
    return
  }

  const fontsDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets', 'fonts')
  fs.mkdirSync(fontsDir, { recursive: true })

  const resolvedPaths = await resolveFontPaths(fonts, projectRoot)

  for (const fontPath of resolvedPaths) {
    const fileName = path.basename(fontPath)
    const dest = path.join(fontsDir, fileName)

    fs.copyFileSync(fontPath, dest)
    logger.info(`Copied font to Android assets: ${fileName}`)
  }

  logger.info(`Copied ${resolvedPaths.length} font(s) to Android assets/fonts/`)
}

/**
 * Resolves font file paths from the provided array of paths or directories.
 * Expands directories and filters to valid font extensions.
 */
async function resolveFontPaths(fonts: string[], projectRoot: string): Promise<string[]> {
  const results: string[] = []

  for (const p of fonts) {
    const resolvedPath = path.resolve(projectRoot, p)

    try {
      const stat = fs.statSync(resolvedPath)

      if (stat.isDirectory()) {
        const files = fs.readdirSync(resolvedPath)
        for (const file of files) {
          const fullPath = path.join(resolvedPath, file)
          if (FONT_EXTENSIONS.some((ext) => fullPath.endsWith(ext))) {
            results.push(fullPath)
          }
        }
      } else if (FONT_EXTENSIONS.some((ext) => resolvedPath.endsWith(ext))) {
        results.push(resolvedPath)
      }
    } catch {
      logger.warn(`Could not resolve Android font path: ${resolvedPath}`)
    }
  }

  return results
}
