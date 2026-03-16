import { createVoltraRenderer } from '../renderer/renderer.js'
import type { WidgetVariants } from './types.js'

/**
 * Renders widget variants to JSON.
 */
export const renderWidgetToJson = (variants: WidgetVariants): Record<string, any> => {
  const renderer = createVoltraRenderer()

  // Add all widget family variants
  for (const [family, content] of Object.entries(variants)) {
    if (content !== undefined) {
      renderer.addRootNode(family, content)
    }
  }

  // Render and return result
  return renderer.render()
}

/**
 * Renders widget variants to a JSON string.
 */
export const renderWidgetToString = (variants: WidgetVariants): string => {
  return JSON.stringify(renderWidgetToJson(variants))
}
