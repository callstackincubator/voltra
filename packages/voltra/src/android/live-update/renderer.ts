import type { ComponentRegistry } from '../../renderer/index.js'
import { createVoltraRenderer } from '../../renderer/index.js'
import { getAndroidComponentId } from '../payload/component-ids.js'
import type { AndroidLiveUpdateJson, AndroidLiveUpdateVariants } from './types.js'

/**
 * Android component registry that uses Android component ID mappings
 */
const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

/**
 * Renders Android Live Update variants to JSON.
 * Uses the Android component registry for component ID lookups.
 */
export const renderAndroidLiveUpdateToJson = (variants: AndroidLiveUpdateVariants): AndroidLiveUpdateJson => {
  // Create renderer with Android component registry
  const renderer = createVoltraRenderer(androidComponentRegistry)

  // Add collapsed notification content
  if (variants.collapsed) {
    renderer.addRootNode('collapsed', variants.collapsed)
  }

  // Add expanded notification content
  if (variants.expanded) {
    renderer.addRootNode('expanded', variants.expanded)
  }

  // Render to JSON
  const result = renderer.render() as AndroidLiveUpdateJson

  // Add non-JSX properties
  if (variants.smallIcon) {
    result.smallIcon = variants.smallIcon
  }

  if (variants.channelId) {
    result.channelId = variants.channelId
  }

  return result
}

/**
 * Renders Android Live Update variants to a JSON string.
 */
export const renderAndroidLiveUpdateToString = (variants: AndroidLiveUpdateVariants): string => {
  return JSON.stringify(renderAndroidLiveUpdateToJson(variants))
}
