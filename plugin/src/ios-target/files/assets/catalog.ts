import * as fs from 'fs'
import * as path from 'path'

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
export function generateAssetsCatalog(targetPath: string): void {
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
export function addImageToAssetsCatalog(assetsPath: string, imagePath: string): void {
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
