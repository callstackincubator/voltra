import type { ReactNode } from 'react'

import { createVoltraRenderer } from '../renderer/index.js'
import type { LiveActivityJson, LiveActivityVariants } from './types.js'

/**
 * Renders Live Activity variants to JSON.
 * Handles non-JSX properties like keylineTint and activityBackgroundTint separately.
 */
export const renderLiveActivityToJson = (variants: LiveActivityVariants): LiveActivityJson => {
  const renderer = createVoltraRenderer()

  // Add lock screen variant
  if (variants.lockScreen) {
    const lockScreenVariant = variants.lockScreen
    if (typeof lockScreenVariant === 'object' && lockScreenVariant !== null && 'content' in lockScreenVariant) {
      if (lockScreenVariant.content) {
        renderer.addRootNode('ls', lockScreenVariant.content)
      }
    } else {
      renderer.addRootNode('ls', lockScreenVariant as ReactNode)
    }
  }

  // Add island variants
  if (variants.island) {
    if (variants.island.expanded) {
      if (variants.island.expanded.center) {
        renderer.addRootNode('isl_exp_c', variants.island.expanded.center)
      }
      if (variants.island.expanded.leading) {
        renderer.addRootNode('isl_exp_l', variants.island.expanded.leading)
      }
      if (variants.island.expanded.trailing) {
        renderer.addRootNode('isl_exp_t', variants.island.expanded.trailing)
      }
      if (variants.island.expanded.bottom) {
        renderer.addRootNode('isl_exp_b', variants.island.expanded.bottom)
      }
    }
    if (variants.island.compact) {
      if (variants.island.compact.leading) {
        renderer.addRootNode('isl_cmp_l', variants.island.compact.leading)
      }
      if (variants.island.compact.trailing) {
        renderer.addRootNode('isl_cmp_t', variants.island.compact.trailing)
      }
    }
    if (variants.island.minimal) {
      renderer.addRootNode('isl_min', variants.island.minimal)
    }
  }

  // Add supplemental activity family variants (iOS 18+)
  if (variants.supplementalActivityFamilies?.small) {
    renderer.addRootNode('saf_sm', variants.supplementalActivityFamilies.small)
  }

  // Render all variants
  const result = renderer.render() as LiveActivityJson

  // Add non-JSX properties after rendering
  if (
    variants.lockScreen &&
    typeof variants.lockScreen === 'object' &&
    'activityBackgroundTint' in variants.lockScreen
  ) {
    if (variants.lockScreen.activityBackgroundTint) {
      result.ls_background_tint = variants.lockScreen.activityBackgroundTint
    }
  }

  if (variants.island?.keylineTint) {
    result.isl_keyline_tint = variants.island.keylineTint
  }

  return result
}

/**
 * Renders Live Activity variants to a JSON string.
 */
export const renderLiveActivityToString = (variants: LiveActivityVariants): string => {
  return JSON.stringify(renderLiveActivityToJson(variants))
}
