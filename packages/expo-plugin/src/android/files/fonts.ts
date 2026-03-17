/**
 * Font configuration for Android widgets.
 *
 * Copies custom font files to the Android assets/fonts/ directory
 * so they can be loaded by TextBitmapRenderer via Typeface.createFromAsset().
 */

import * as fs from 'fs'
import * as path from 'path'

import { resolveFontPaths } from '../../utils/fonts'
import { logger } from '../../utils/logger'

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
