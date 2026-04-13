import { getAndroidComponentId } from '../payload/component-ids.js'
import type { ComponentRegistry } from '../renderer/index.js'
import { createVoltraRenderer } from '../renderer/index.js'
import type { AndroidLiveUpdateJson, AndroidLiveUpdateVariants } from './types.js'

const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

export const renderAndroidLiveUpdateToJson = (variants: AndroidLiveUpdateVariants): AndroidLiveUpdateJson => {
  const renderer = createVoltraRenderer(androidComponentRegistry)

  if (variants.collapsed) {
    renderer.addRootNode('collapsed', variants.collapsed)
  }

  if (variants.expanded) {
    renderer.addRootNode('expanded', variants.expanded)
  }

  const result = renderer.render() as AndroidLiveUpdateJson

  if (variants.smallIcon) {
    result.smallIcon = variants.smallIcon
  }

  if (variants.channelId) {
    result.channelId = variants.channelId
  }

  return result
}

export const renderAndroidLiveUpdateToString = (variants: AndroidLiveUpdateVariants): string => {
  return JSON.stringify(renderAndroidLiveUpdateToJson(variants))
}
