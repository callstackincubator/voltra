import { createVoltraComponent } from './createVoltraComponent.js'
import type { BoxProps } from './props/Box.js'

export type { BoxProps }
export const Box = createVoltraComponent<BoxProps>('AndroidBox')
