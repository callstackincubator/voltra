import type { PreloadImageOptions, PreloadImagesResult } from '../types.js'
import VoltraModule from '../VoltraModule.js'

/**
 * Preload images to Android cache for use in Widgets.
 *
 * Downloaded images are stored in the app's cache directory and exposed via FileProvider.
 * Images can then be referenced using the `assetName` property in the Image component.
 *
 * @param images - Array of images to preload
 * @returns Result indicating which images succeeded or failed
 *
 * @example
 * ```typescript
 * const result = await preloadImages([
 *   {
 *     url: 'https://example.com/album-art.jpg',
 *     key: 'current-album',
 *     headers: { 'Authorization': 'Bearer token' }
 *   }
 * ])
 *
 * // Use in Android Widget
 * <VoltraAndroid.Image source={{ assetName: 'current-album' }} />
 * ```
 */
export async function preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult> {
  try {
    return await VoltraModule.preloadImages(images)
  } catch (error) {
    return {
      succeeded: [],
      failed: images.map((img) => ({
        key: img.key,
        error: error instanceof Error ? error.message : 'Unknown error',
      })),
    }
  }
}

/**
 * Clear preloaded images from Android cache.
 *
 * @param keys - Optional array of image keys to clear. If omitted, clears all preloaded images.
 *
 * @example
 * ```typescript
 * // Clear specific images
 * await clearPreloadedImages(['album-art', 'profile-pic'])
 *
 * // Clear all preloaded images
 * await clearPreloadedImages()
 * ```
 */
export async function clearPreloadedImages(keys?: string[]): Promise<void> {
  try {
    await VoltraModule.clearPreloadedImages(keys ?? null)
  } catch (error) {
    console.error('Failed to clear preloaded images:', error)
  }
}

/**
 * Reload Android Widgets. (Alias for reloadAndroidWidgets)
 */
export async function reloadWidgets(widgetIds?: string[]): Promise<void> {
  try {
    await VoltraModule.reloadAndroidWidgets(widgetIds ?? null)
  } catch (error) {
    console.error('Failed to reload Android widgets:', error)
  }
}
