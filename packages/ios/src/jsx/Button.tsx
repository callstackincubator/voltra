import { createVoltraComponent } from './createVoltraComponent.js'
import type { ButtonProps } from './props/Button.js'

export type { ButtonProps }
export const Button = createVoltraComponent<ButtonProps>('Button')
