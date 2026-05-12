import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidRadioButtonProps as RadioButtonProps } from './props/AndroidRadioButton.js'

export type { RadioButtonProps }
export const RadioButton = createVoltraComponent<RadioButtonProps>('AndroidRadioButton')
