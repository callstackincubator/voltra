import { createVoltraRenderer } from '../../renderer/renderer.js'
import type { AndroidWidgetVariants } from './types.js'

/**
 * Renders Android widget variants to JSON with size breakpoints.
 *
 * Output format:
 * {
 *   "v": 1,
 *   "variants": {
 *     "150x100": { ... node tree ... },
 *     "150x200": { ... node tree ... },
 *     "215x100": { ... node tree ... }
 *   },
 *   "s": [...shared styles...],
 *   "e": [...shared elements...]
 * }
 */
export const renderAndroidWidgetToJson = (variants: AndroidWidgetVariants): Record<string, any> => {
  const renderer = createVoltraRenderer()

  // Add each size variant with key format "WIDTHxHEIGHT"
  for (const { size, content } of variants) {
    const key = `${size.width}x${size.height}`
    renderer.addRootNode(key, content)
  }

  return renderer.render()
}

/**
 * Renders Android widget variants to a JSON string.
 */
export const renderAndroidWidgetToString = (variants: AndroidWidgetVariants): string => {
  return JSON.stringify(renderAndroidWidgetToJson(variants))
}
