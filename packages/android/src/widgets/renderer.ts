import { AndroidWidgetRenderContextProvider, type AndroidWidgetRenderContextValue } from '../dynamic-color.js'
import { createElement } from 'react'

import { getAndroidComponentId } from '../payload/component-ids.js'
import { ComponentRegistry, createVoltraRenderer } from '../renderer/renderer.js'
import type { AndroidWidgetVariants } from './types.js'

/**
 * Android component registry that uses Android component ID mappings
 */
const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

export type AndroidWidgetRenderOptions = {
  context?: AndroidWidgetRenderContextValue
}

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
export const renderAndroidWidgetToJson = (
  variants: AndroidWidgetVariants,
  options?: AndroidWidgetRenderOptions
): Record<string, any> => {
  const renderer = createVoltraRenderer(androidComponentRegistry)
  const context = options?.context ?? { theme: null, dynamicColorPalette: null }

  // Add each size variant with key format "WIDTHxHEIGHT"
  for (const { size, content } of variants) {
    const key = `${size.width}x${size.height}`
    renderer.addRootNode(
      key,
      createElement(
        AndroidWidgetRenderContextProvider,
        {
          value: context,
        },
        content
      )
    )
  }

  const rendered = renderer.render()

  // Extract variant keys (everything except v, s, e which are metadata)
  const variantsMap: Record<string, any> = {}
  const metadataKeys = ['v', 's', 'e']

  for (const key of Object.keys(rendered)) {
    if (!metadataKeys.includes(key)) {
      variantsMap[key] = rendered[key]
      delete rendered[key]
    }
  }

  // Add variants as a nested object (expected by Kotlin parser)
  rendered.variants = variantsMap

  return rendered
}

/**
 * Renders Android widget variants to a JSON string.
 */
export const renderAndroidWidgetToString = (
  variants: AndroidWidgetVariants,
  options?: AndroidWidgetRenderOptions
): string => {
  return JSON.stringify(renderAndroidWidgetToJson(variants, options))
}
