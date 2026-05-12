import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidCheckBoxProps as CheckBoxProps } from './props/AndroidCheckBox.js'

export type { CheckBoxProps }
export const CheckBox = createVoltraComponent<CheckBoxProps>('AndroidCheckBox')
