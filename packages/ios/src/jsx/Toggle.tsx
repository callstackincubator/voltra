import { createVoltraComponent } from './createVoltraComponent.js'
import type { ToggleProps } from './props/Toggle.js'

export type { ToggleProps }
export const Toggle = createVoltraComponent<ToggleProps>('Toggle')
