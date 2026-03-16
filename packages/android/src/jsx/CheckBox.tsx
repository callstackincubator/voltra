import { createVoltraComponent } from './createVoltraComponent.js'
import type { CheckBoxProps } from './props/CheckBox.js'

export type { CheckBoxProps }
export const CheckBox = createVoltraComponent<CheckBoxProps>('AndroidCheckBox')
