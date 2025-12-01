import { createVoltraComponent } from './createVoltraComponent'
import type { ListProps } from './props/List'

export type { ListProps }
export const List = createVoltraComponent<ListProps>('List')
