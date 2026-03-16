import {
  type ComponentRegistry,
  createVoltraRenderer as createCoreVoltraRenderer,
  renderVariantToJson,
  VOLTRA_PAYLOAD_VERSION,
} from '@voltra/core'
import type { ReactNode } from 'react'

import { getComponentId } from '../payload/component-ids.js'
import type { VoltraNodeJson } from '../types.js'

const defaultComponentRegistry: ComponentRegistry = {
  getComponentId: (name: string) => getComponentId(name),
}

export { VOLTRA_PAYLOAD_VERSION }
export type { ComponentRegistry }

export const renderVoltraVariantToJson = (element: ReactNode): VoltraNodeJson => {
  return renderVariantToJson(element, defaultComponentRegistry)
}

export const createVoltraRenderer = (componentRegistry: ComponentRegistry = defaultComponentRegistry) => {
  return createCoreVoltraRenderer(componentRegistry)
}
