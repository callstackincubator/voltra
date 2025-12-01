import { createVoltraComponent } from './createVoltraComponent'
import type { ScrollViewProps } from './props/ScrollView'

export type { ScrollViewProps }
export const ScrollView = createVoltraComponent<ScrollViewProps>('ScrollView')
