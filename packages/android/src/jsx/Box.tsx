import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidBoxProps as BoxProps } from './props/AndroidBox.js'

export type { BoxProps }
export const Box = createVoltraComponent<BoxProps>('AndroidBox')
