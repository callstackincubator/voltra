import type {
  PreloadImageFailure,
  PreloadImageOptions,
  PreloadImageSvgOptions,
  PreloadImageUrlOptions,
  PreloadImagesResult,
} from './types.js'

type NativePreloadModule = {
  preloadUrlImages(images: PreloadImageUrlOptions[]): Promise<PreloadImagesResult>
  preloadSvgImages(images: PreloadImageSvgOptions[]): Promise<PreloadImagesResult>
}

const emptyResult: PreloadImagesResult = {
  succeeded: [],
  failed: [],
}

function hasStringValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function preloadGroup<T extends PreloadImageOptions>(
  images: T[],
  preload: (images: T[]) => Promise<PreloadImagesResult>
): Promise<PreloadImagesResult> {
  if (images.length === 0) {
    return emptyResult
  }

  try {
    return await preload(images)
  } catch (error) {
    return {
      succeeded: [],
      failed: images.map((image) => ({
        key: image.key,
        error: errorMessage(error),
      })),
    }
  }
}

export async function dispatchPreloadImages(
  nativeModule: NativePreloadModule,
  images: PreloadImageOptions[]
): Promise<PreloadImagesResult> {
  const urlImages: PreloadImageUrlOptions[] = []
  const svgImages: PreloadImageSvgOptions[] = []
  const invalidImages: PreloadImageFailure[] = []

  for (const image of images) {
    if ('svg' in image && hasStringValue(image.svg)) {
      svgImages.push(image)
    } else if ('url' in image && hasStringValue(image.url)) {
      urlImages.push(image)
    } else {
      invalidImages.push({
        key: image.key,
        error: `Image '${image.key}' must provide either url or svg`,
      })
    }
  }

  const [urlResult, svgResult] = await Promise.all([
    preloadGroup(urlImages, (group) => nativeModule.preloadUrlImages(group)),
    preloadGroup(svgImages, (group) => nativeModule.preloadSvgImages(group)),
  ])

  return {
    succeeded: [...urlResult.succeeded, ...svgResult.succeeded],
    failed: [...invalidImages, ...urlResult.failed, ...svgResult.failed],
  }
}
