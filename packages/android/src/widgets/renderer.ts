import { createElement, Fragment as ReactFragment, type ReactNode } from 'react'

import { getAndroidComponentId } from '../payload/component-ids.js'
import { ComponentRegistry, createVoltraRenderer } from '../renderer/renderer.js'
import type { AndroidWidgetVariants } from './types.js'

/**
 * Android component registry that uses Android component ID mappings
 */
const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

export type AndroidWidgetRenderOptions = Record<string, never>

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
  _options?: AndroidWidgetRenderOptions
): Record<string, any> => {
  const renderer = createVoltraRenderer(androidComponentRegistry)

  // Add each size variant with key format "WIDTHxHEIGHT"
  for (const { size, content } of variants) {
    const key = `${size.width}x${size.height}`
    renderer.addRootNode(key, createElement(ReactFragment, null, content))
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

/**
 * Renders Android JSX to JSON for VoltraView component.
 */
export const renderAndroidViewToJson = (
  children: ReactNode,
  _options?: AndroidWidgetRenderOptions
): Record<string, any> => {
  const renderer = createVoltraRenderer(androidComponentRegistry)

  renderer.addRootNode('content', createElement(ReactFragment, null, children))

  const rendered = renderer.render()
  const node = rendered.content

  delete rendered.content
  rendered.variants = { content: node }

  return rendered
}
