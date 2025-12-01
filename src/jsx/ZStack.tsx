import { createVoltraComponent } from './createVoltraComponent'
import type { ZStackProps } from './props/ZStack'

export type { ZStackProps }
export const ZStack = createVoltraComponent<ZStackProps>('ZStack')
