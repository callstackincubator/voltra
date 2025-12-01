import { createVoltraComponent } from './createVoltraComponent'
import type { VStackProps } from './props/VStack'

export type { VStackProps }
export const VStack = createVoltraComponent<VStackProps>('VStack')
