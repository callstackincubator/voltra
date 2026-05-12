import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidButtonProps as ButtonProps } from './props/AndroidButton.js'

export type { ButtonProps }
export const Button = createVoltraComponent<ButtonProps>('AndroidButton')
