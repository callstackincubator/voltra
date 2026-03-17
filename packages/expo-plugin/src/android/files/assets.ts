import * as fs from 'fs'
import * as path from 'path'
import { vdConvert } from 'vd-tool'

import { DEFAULT_ANDROID_USER_IMAGES_PATH, MAX_IMAGE_SIZE_BYTES } from '../../constants'
import type { AndroidWidgetConfig } from '../../types'
import { logger } from '../../utils/logger'

export interface GenerateAndroidAssetsOptions {
  platformProjectRoot: string
  projectRoot: string
  userImagesPath?: string
  widgets: AndroidWidgetConfig[]
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generates all asset files for Android widgets.
 *
 * This creates:
 * - res/drawable/ directory structure
 * - Copies user images to drawable resources as Android-compatible resources
 * - Copies widget preview images to drawable resources
 * - Validates image sizes for widget compatibility
 *
 * @returns Map of widgetId to preview image drawable resource name
 */
export async function generateAndroidAssets(options: GenerateAndroidAssetsOptions): Promise<Map<string, string>> {
  const { platformProjectRoot, projectRoot, userImagesPath = DEFAULT_ANDROID_USER_IMAGES_PATH, widgets } = options

  // Create res/drawable directory
  const drawablePath = path.join(platformProjectRoot, 'app', 'src', 'main', 'res', 'drawable')
  logger.info(`Generating Android assets in ${drawablePath}`)

  // Collect asset paths from the user images directory (including subdirectories)
  const assets: string[] = []
  const fullUserImagesPath = path.join(projectRoot, userImagesPath)

  function collectAssetsRecursively(dirPath: string) {
    if (!fs.existsSync(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
      return
    }

    const files = fs.readdirSync(dirPath)
    for (const file of files) {
      const sourcePath = path.join(dirPath, file)
      const stat = fs.lstatSync(sourcePath)

      if (stat.isDirectory()) {
        // Recursively collect from subdirectories
        collectAssetsRecursively(sourcePath)
      } else {
        // Add relative path to assets array
        const relativePath = path.relative(projectRoot, sourcePath)
        assets.push(relativePath)
      }
    }
  }

  collectAssetsRecursively(fullUserImagesPath)

  // Copy user images to drawable resources
  const copiedImages = await copyUserImagesToAndroid(assets, projectRoot, drawablePath)

  if (copiedImages.length > 0) {
    logger.info(`Copied ${copiedImages.length} user image(s) to Android drawable resources`)
  }

  // Copy preview images to drawable resources
  const previewImageMap = await copyPreviewImagesToAndroid(widgets, projectRoot, drawablePath)

  if (previewImageMap.size > 0) {
    logger.info(`Copied ${previewImageMap.size} preview image(s) to Android drawable resources`)
  }

  return previewImageMap
}

// ============================================================================
// Image Handling
// ============================================================================

// Android supports these image/drawable extensions
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.xml', '.svg']

/**
 * Checks if an image file exceeds the size limit for widgets.
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
        `This image may not display correctly in Android widgets as images should be kept small for performance.`
    )
    return false
  }

  return true
}

/**
 * Flattens path and sanitizes name.
 * E.g. "assets/login/User-Icon.png" -> "login_user_icon"
 */
function sanitizeDrawableName(filePath: string): string {
  const dirName = path.dirname(filePath) // e.g. "assets/login" or "."
  const fileName = path.parse(filePath).name // e.g. "User-Icon"

  // Combine directory parts (ignoring '.' or root) with filename
  let nameParts: string[] = []

  // If the file is in a subfolder relative to the project root, include it
  if (dirName !== '.' && dirName !== 'assets') {
    // Split path by separator and add to parts
    const parts = dirName.split(path.sep)
    // Filter out 'assets', 'voltra', 'voltra-android' if they are the top folders to avoid redundant prefixes
    const cleanParts = parts.filter((p) => p !== 'assets' && p !== 'voltra' && p !== 'voltra-android' && p !== '.')
    nameParts = [...nameParts, ...cleanParts]
  }

  nameParts.push(fileName)

  // Join with underscore
  let finalName = nameParts.join('_').toLowerCase()

  // Replace invalid characters
  finalName = finalName.replace(/[^a-z0-9_]/g, '_')

  // Ensure start with letter
  if (!/^[a-z]/.test(finalName)) {
    finalName = `img_${finalName}`
  }

  return finalName
}

/**
 * Process SVG image: Convert to Android Vector Drawable (XML) and write to destination.
 */
async function processSvgImage(sourcePath: string, destinationPath: string): Promise<void> {
  try {
    // vd-tool converts a file to XML. We'll copy the SVG to the destination first
    // so it has the sanitized name, then convert it there.
    fs.copyFileSync(sourcePath, destinationPath)
    await vdConvert(destinationPath)
    // Remove the temporary SVG file at the destination
    fs.unlinkSync(destinationPath)
  } catch (error) {
    // Cleanup if something failed
    if (fs.existsSync(destinationPath)) {
      fs.unlinkSync(destinationPath)
    }
    throw new Error(`Failed to convert SVG to Vector Drawable: ${sourcePath}. Error: ${error}`)
  }
}

/**
 * Process Bitmap/XML image: Check size and copy to destination.
 */
function processBitmapImage(sourcePath: string, destinationPath: string): void {
  const extension = path.extname(sourcePath).toLowerCase()
  // Check image size for widget compatibility (warns if too large) - only for image files
  if (extension !== '.xml') {
    checkImageSize(sourcePath)
  }
  fs.copyFileSync(sourcePath, destinationPath)
}

/**
 * Copies assets to the Android drawable resources directory.
 *
 * Assets are validated for existence and extension, then copied to res/drawable/
 * with Android-compatible names. SVGs are converted to XML.
 *
 * @param assets - Array of asset file paths (relative to project root)
 * @param projectRoot - Path to the project root
 * @param drawablePath - Path to the res/drawable directory in the Android project
 * @returns Array of drawable resource names that were copied
 */
async function copyUserImagesToAndroid(assets: string[], projectRoot: string, drawablePath: string): Promise<string[]> {
  const copiedImages: string[] = []

  // Ensure drawable directory exists
  if (!fs.existsSync(drawablePath)) {
    fs.mkdirSync(drawablePath, { recursive: true })
  }

  // Iterate over the assets array
  for (const assetPath of assets) {
    const sourceFile = path.join(projectRoot, assetPath)
    const extension = path.extname(assetPath).toLowerCase()

    // VALIDATION: Check file existence
    if (!fs.existsSync(sourceFile)) {
      logger.warn(`⚠️  Warning: Asset not found at ${sourceFile}. Skipping.`)
      continue
    }

    // VALIDATION: Check extension
    if (!VALID_EXTENSIONS.includes(extension)) {
      throw new Error(
        `❌ Validating ${assetPath}: '${extension}' is not a supported Android drawable extension. Supported: ${VALID_EXTENSIONS.join(
          ', '
        )}`
      )
    }

    // SANITIZATION: Generate new filename
    const cleanName = sanitizeDrawableName(assetPath)
    const destinationFile = path.join(drawablePath, `${cleanName}${extension}`)

    // Process based on extension
    if (extension === '.svg') {
      await processSvgImage(sourceFile, destinationFile)
    } else {
      processBitmapImage(sourceFile, destinationFile)
    }

    copiedImages.push(cleanName)
  }

  return copiedImages
}

// ============================================================================
// Preview Images
// ============================================================================

/**
 * Copies preview images to Android drawable resources.
 * Returns a map of widgetId to drawable resource name.
 */
async function copyPreviewImagesToAndroid(
  widgets: AndroidWidgetConfig[],
  projectRoot: string,
  drawablePath: string
): Promise<Map<string, string>> {
  const previewImageMap = new Map<string, string>()

  // Ensure drawable directory exists
  if (!fs.existsSync(drawablePath)) {
    fs.mkdirSync(drawablePath, { recursive: true })
  }

  for (const widget of widgets) {
    if (!widget.previewImage) {
      continue
    }

    const sourcePath = path.join(projectRoot, widget.previewImage)

    // Validate file exists
    if (!fs.existsSync(sourcePath)) {
      logger.warn(`Preview image not found for widget '${widget.id}' at ${widget.previewImage}`)
      continue
    }

    // Warn if image exceeds size limit (does not block copy for Android widgets)
    checkImageSize(sourcePath)

    // Generate drawable resource name
    const ext = path.extname(widget.previewImage).toLowerCase()
    const drawableName = `voltra_widget_${widget.id}_preview`
    const destinationPath = path.join(drawablePath, `${drawableName}${ext}`)

    // Copy file
    fs.copyFileSync(sourcePath, destinationPath)
    logger.info(`Copied preview image for widget '${widget.id}' to ${drawableName}${ext}`)

    previewImageMap.set(widget.id, drawableName)
  }

  return previewImageMap
}

export { copyPreviewImagesToAndroid }
