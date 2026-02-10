import { createVoltraComponent } from './createVoltraComponent.js'
import type { ViewProps } from './props/View.js'

export type { ViewProps }
export const View = createVoltraComponent<ViewProps>('View')
