import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidSwitchProps as SwitchProps } from './props/AndroidSwitch.js'

export type { SwitchProps }
export const Switch = createVoltraComponent<SwitchProps>('AndroidSwitch')
