import * as path from 'path'

import { DEFAULT_USER_IMAGES_PATH } from '../../../../constants'
import { logger } from '../../../../utils'
import { generateAssetsCatalog } from './catalog'
import { copyUserImages } from './images'

export interface GenerateAssetsOptions {
  targetPath: string
  userImagesPath?: string
}

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
