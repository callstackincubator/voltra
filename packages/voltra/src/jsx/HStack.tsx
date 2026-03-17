import { createVoltraComponent } from './createVoltraComponent.js'
import type { HStackProps } from './props/HStack.js'

export type { HStackProps }
export const HStack = createVoltraComponent<HStackProps>('HStack')
