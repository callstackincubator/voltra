import type { PreloadImageOptions, PreloadImagesResult } from './types.js'
import VoltraModule from './VoltraModule.js'

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

export async function clearPreloadedImages(keys?: string[]): Promise<void> {
  try {
    await VoltraModule.clearPreloadedImages(keys ?? null)
  } catch (error) {
    console.error('Failed to clear preloaded images:', error)
  }
}

export async function reloadWidgets(widgetIds?: string[]): Promise<void> {
  try {
    await VoltraModule.reloadAndroidWidgets(widgetIds ?? null)
  } catch (error) {
    console.error('Failed to reload Android widgets:', error)
  }
}
