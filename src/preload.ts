import { Platform } from 'react-native'

import VoltraModule from './VoltraModule'

/**
 * Options for preloading a single image
 */
export type PreloadImageOptions = {
  /**
   * The URL to download the image from
   */
  url: string
  /**
   * The key to use when referencing this image (used as assetName in Image component)
   */
  key: string
  /**
   * HTTP method to use. Defaults to 'GET'.
   */
  method?: 'GET' | 'POST' | 'PUT'
  /**
   * Optional HTTP headers to include in the request
   */
  headers?: Record<string, string>
}

/**
 * Result of preloading images
 */
export type PreloadImagesResult = {
  /**
   * Keys of images that were successfully preloaded
   */
  succeeded: string[]
  /**
   * Images that failed to preload, with error messages
   */
  failed: { key: string; error: string }[]
}

function assertIOS(name: string): boolean {
  const isIOS = Platform.OS === 'ios'
  if (!isIOS) console.error(`${name} is only available on iOS`)
  return isIOS
}

/**
 * Preload images to App Group storage for use in Live Activities.
 *
 * Downloaded images are stored in shared storage accessible by both the app
 * and the Live Activity widget extension. Images can then be referenced using
 * the `assetName` property in the Image component.
 *
 * Images must be less than 4KB to comply with ActivityKit limits.
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
 * // Use in Live Activity
 * <Voltra.Image source={{ assetName: 'current-album' }} />
 * ```
 */
export async function preloadImages(images: PreloadImageOptions[]): Promise<PreloadImagesResult> {
  if (!assertIOS('preloadImages')) {
    return { succeeded: [], failed: images.map((img) => ({ key: img.key, error: 'Not available on this platform' })) }
  }

  try {
    return await (VoltraModule as any).preloadImages(images)
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
 * Reload Live Activities to pick up newly preloaded images.
 *
 * This triggers an update on the specified Live Activities (or all if none specified)
 * with their current content state, forcing SwiftUI to re-render and load the
 * newly preloaded images from App Group storage.
 *
 * @param activityIds - Optional array of activity IDs to reload. If omitted, reloads all.
 *
 * @example
 * ```typescript
 * // Preload new image
 * await preloadImages([{ url: 'https://example.com/new-art.jpg', key: 'album-art' }])
 *
 * // Reload specific activity to pick up the new image
 * await reloadLiveActivities(['music-player'])
 *
 * // Or reload all activities
 * await reloadLiveActivities()
 * ```
 */
export async function reloadLiveActivities(activityIds?: string[]): Promise<void> {
  if (!assertIOS('reloadLiveActivities')) return

  try {
    await (VoltraModule as any).reloadLiveActivities(activityIds ?? null)
  } catch (error) {
    console.error('Failed to reload Live Activities:', error)
  }
}

/**
 * Clear preloaded images from App Group storage.
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
  if (!assertIOS('clearPreloadedImages')) return

  try {
    await (VoltraModule as any).clearPreloadedImages(keys ?? null)
  } catch (error) {
    console.error('Failed to clear preloaded images:', error)
  }
}
