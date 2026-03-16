import { createVoltraComponent } from './createVoltraComponent.js'
import type { SwitchProps } from './props/Switch.js'

export type { SwitchProps }
export const Switch = createVoltraComponent<SwitchProps>('AndroidSwitch')
