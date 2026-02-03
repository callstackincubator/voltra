import * as fs from 'fs'
import * as path from 'path'

import { MAX_IMAGE_SIZE_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '../../../../constants'
import { logger } from '../../../../utils'
import { addImageToAssetsCatalog } from './catalog'

/**
 * Checks if an image file exceeds the size limit for Live Activities.
 * Logs a warning if the image is too large.
 *
 * @param imagePath - Path to the image file
 * @returns true if the image is within the size limit, false otherwise
 */
export function checkImageSize(imagePath: string): boolean {
  const stats = fs.statSync(imagePath)
  const imageSizeInBytes = stats.size

  if (imageSizeInBytes >= MAX_IMAGE_SIZE_BYTES) {
    const fileName = path.basename(imagePath)
    logger.warnRed(
      `Image "${fileName}" is ${imageSizeInBytes} bytes (${(imageSizeInBytes / 1024).toFixed(2)}KB). ` +
        `This image will not display correctly in Live Activities as images for Live Activities need to be lower than 4KB.`
    )
    return false
  }

  return true
}

/**
 * Checks if a file is a supported image type.
 */
export function isSupportedImage(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.test(path.extname(filePath))
}

/**
 * Copies user images from the source directory to the widget's Assets.xcassets.
 *
 * Images are validated for size (must be < 4KB for Live Activities) and
 * added as imagesets to the asset catalog.
 *
 * @param userImagesPath - Path to directory containing user images (relative to project root)
 * @param targetAssetsPath - Path to the Assets.xcassets directory in the widget target
 * @returns Array of image filenames that were copied
 */
export function copyUserImages(userImagesPath: string, targetAssetsPath: string): string[] {
  const copiedImages: string[] = []

  if (!fs.existsSync(userImagesPath)) {
    logger.warn(`Skipping user images: directory does not exist at ${userImagesPath}`)
    return copiedImages
  }

  if (!fs.lstatSync(userImagesPath).isDirectory()) {
    logger.warn(`Skipping user images: ${userImagesPath} is not a directory`)
    return copiedImages
  }

  const files = fs.readdirSync(userImagesPath)

  for (const file of files) {
    const sourcePath = path.join(userImagesPath, file)

    // Skip directories and non-image files
    if (fs.lstatSync(sourcePath).isDirectory()) {
      continue
    }

    if (!isSupportedImage(file)) {
      continue
    }

    // Check image size for Live Activity compatibility (warns if too large)
    checkImageSize(sourcePath)

    // Add to asset catalog
    addImageToAssetsCatalog(targetAssetsPath, sourcePath)
    copiedImages.push(file)
  }

  if (copiedImages.length > 0) {
    logger.info(`Copied ${copiedImages.length} user image(s) to widget assets`)
  }

  return copiedImages
}
