import { ReactNode } from 'react'

import { VoltraNodeJson } from '../types.js'
import { VoltraVariantRenderer } from './types.js'

export type RenderCache = {
  getOrRender: VoltraVariantRenderer
}

export const getRenderCache = (renderer: VoltraVariantRenderer): RenderCache => {
  const renderCache = new Map<ReactNode, VoltraNodeJson>()

  return {
    getOrRender: (node: ReactNode): VoltraNodeJson => {
      const cached = renderCache.get(node)

      if (cached) {
        return cached
      }

      const result = renderer(node)
      renderCache.set(node, result)

      return result
    },
  }
}
