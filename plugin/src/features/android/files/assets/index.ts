import * as fs from 'fs'
import * as path from 'path'

import { DEFAULT_ANDROID_USER_IMAGES_PATH } from '../../../../constants'
import { logger } from '../../../../utils'
import { copyUserImagesToAndroid } from './images'

export interface GenerateAndroidAssetsOptions {
  platformProjectRoot: string
  projectRoot: string
  userImagesPath?: string
}

/**
 * Generates all asset files for Android widgets.
 *
 * This creates:
 * - res/drawable/ directory structure
 * - Copies user images to drawable resources as Android-compatible resources
 * - Validates image sizes for widget compatibility
 */
export async function generateAndroidAssets(options: GenerateAndroidAssetsOptions): Promise<void> {
  const { platformProjectRoot, projectRoot, userImagesPath = DEFAULT_ANDROID_USER_IMAGES_PATH } = options

  // Create res/drawable directory
  const drawablePath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable')
  logger.info(`Generating Android assets in ${drawablePath}`)

  // Collect asset paths from the user images directory (including subdirectories)
  const assets: string[] = []
  const fullUserImagesPath = path.join(projectRoot, userImagesPath)

  function collectAssetsRecursively(dirPath: string, relativeBase: string) {
    if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
      return
    }

    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      const sourcePath = path.join(dirPath, file)
      const stat = fs.lstatSync(sourcePath)

      if (stat.isDirectory()) {
        // Recursively collect from subdirectories
        collectAssetsRecursively(sourcePath, relativeBase)
      } else {
        // Add relative path to assets array
        const relativePath = path.relative(projectRoot, sourcePath)
        assets.push(relativePath)
      }
    }
  }

  collectAssetsRecursively(fullUserImagesPath, userImagesPath)

  // Copy user images to drawable resources
  const copiedImages = await copyUserImagesToAndroid(assets, projectRoot, drawablePath)

  if (copiedImages.length > 0) {
    logger.info(`Copied ${copiedImages.length} user image(s) to Android drawable resources`)
  }
}
