import * as fs from 'fs'
import * as path from 'path'
import { vdConvert } from 'vd-tool'

import { MAX_IMAGE_SIZE_BYTES } from '../../../../constants'
import { logger } from '../../../../utils'

// Android supports these image/drawable extensions
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.xml', '.svg']

/**
 * Checks if an image file exceeds the size limit for widgets.
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
export async function copyUserImagesToAndroid(
  assets: string[],
  projectRoot: string,
  drawablePath: string
): Promise<string[]> {
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
