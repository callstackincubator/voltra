import { createVoltraComponent } from './createVoltraComponent.js'
import type { ZStackProps } from './props/ZStack.js'

export type { ZStackProps }
export const ZStack = createVoltraComponent<ZStackProps>('ZStack')
