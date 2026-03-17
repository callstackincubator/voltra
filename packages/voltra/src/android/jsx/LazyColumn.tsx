import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { LazyColumnProps } from './props/LazyColumn.js'

export type { LazyColumnProps }
export const LazyColumn = createVoltraComponent<LazyColumnProps>('AndroidLazyColumn')
