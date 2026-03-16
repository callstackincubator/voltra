import { createVoltraComponent } from './createVoltraComponent.js'
import type { VStackProps } from './props/VStack.js'

export type { VStackProps }
export const VStack = createVoltraComponent<VStackProps>('VStack')
