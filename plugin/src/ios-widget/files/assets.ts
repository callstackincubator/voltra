import * as fs from 'fs'
import * as path from 'path'

import { DEFAULT_USER_IMAGES_PATH, MAX_IMAGE_SIZE_BYTES, SUPPORTED_IMAGE_EXTENSIONS } from '../../constants'
import { logger } from '../../utils/logger'

export interface GenerateAssetsOptions {
  targetPath: string
  userImagesPath?: string
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates all asset files for the widget extension.
 *
 * This creates:
 * - Assets.xcassets/ directory structure
 * - Copies user images to the asset catalog
 */
export function generateAssets(options: GenerateAssetsOptions): void {
  const { targetPath, userImagesPath = DEFAULT_USER_IMAGES_PATH } = options

  // Generate Assets.xcassets structure
  generateAssetsCatalog(targetPath)
  logger.info('Generated Assets.xcassets')

  // Copy user images to asset catalog
  const assetsPath = path.join(targetPath, 'Assets.xcassets')
  copyUserImages(userImagesPath, assetsPath)
}

// ============================================================================
// Asset Catalog
// ============================================================================

/**
 * Contents.json for the root of Assets.xcassets
 */
const ASSETS_CATALOG_CONTENTS = {
  info: {
    author: 'xcode',
    version: 1,
  },
}

/**
 * Contents.json for an imageset
 */
function createImagesetContents(filename: string) {
  return {
    images: [
      {
        filename,
        idiom: 'universal',
      },
    ],
    info: {
      author: 'xcode',
      version: 1,
    },
  }
}

/**
 * Generates the Assets.xcassets directory structure for a widget extension.
 *
 * Creates the minimal required asset catalog structure:
 * - Assets.xcassets/
 *   - Contents.json (required root manifest)
 *
 * @param targetPath - Path to the widget extension target directory
 */
function generateAssetsCatalog(targetPath: string): void {
  const assetsPath = path.join(targetPath, 'Assets.xcassets')

  // Create Assets.xcassets directory
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true })
  }

  // Write root Contents.json
  fs.writeFileSync(path.join(assetsPath, 'Contents.json'), JSON.stringify(ASSETS_CATALOG_CONTENTS, null, 2))
}

/**
 * Adds an image to the Assets.xcassets catalog as an imageset.
 *
 * Creates:
 * - {imageName}.imageset/
 *   - {originalFilename}
 *   - Contents.json
 *
 * @param assetsPath - Path to Assets.xcassets directory
 * @param imagePath - Path to the source image file
 */
function addImageToAssetsCatalog(assetsPath: string, imagePath: string): void {
  const filename = path.basename(imagePath)
  const imageName = path.basename(filename, path.extname(filename))
  const imagesetPath = path.join(assetsPath, `${imageName}.imageset`)

  // Create imageset directory
  if (!fs.existsSync(imagesetPath)) {
    fs.mkdirSync(imagesetPath, { recursive: true })
  }

  // Copy the image file
  fs.copyFileSync(imagePath, path.join(imagesetPath, filename))

  // Write Contents.json for the imageset
  fs.writeFileSync(path.join(imagesetPath, 'Contents.json'), JSON.stringify(createImagesetContents(filename), null, 2))
}

// ============================================================================
// Image Handling
// ============================================================================

/**
 * Checks if an image file exceeds the size limit for Live Activities.
 * Logs a warning if the image is too large.
 *
 * @param imagePath - Path to the image file
 * @returns true if the image is within the size limit, false otherwise
 */
function checkImageSize(imagePath: string): boolean {
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
function isSupportedImage(filePath: string): boolean {
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
function copyUserImages(userImagesPath: string, targetAssetsPath: string): string[] {
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
