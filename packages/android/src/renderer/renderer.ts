import {
  type ComponentRegistry,
  createVoltraRenderer as createCoreVoltraRenderer,
  renderVariantToJson,
  VOLTRA_PAYLOAD_VERSION,
} from '@use-voltra/core'
import type { ReactNode } from 'react'

import { getAndroidComponentId } from '../payload/component-ids.js'
import { validateAndroidLayoutChildLimit } from '../payload/validate-layout-child-limit.js'
import type { VoltraNodeJson } from '../types.js'

export const androidComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getAndroidComponentId(name),
}

export { VOLTRA_PAYLOAD_VERSION }
export type { ComponentRegistry }

export const renderAndroidVariantToJson = (element: ReactNode): VoltraNodeJson => {
  const rendered = renderVariantToJson(element, androidComponentRegistry)
  validateAndroidLayoutChildLimit({ variants: { content: rendered } })
  return rendered
}

export const createVoltraRenderer = (componentRegistry: ComponentRegistry = androidComponentRegistry) => {
  return createCoreVoltraRenderer(componentRegistry)
}
