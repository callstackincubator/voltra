import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidLazyColumnProps as LazyColumnProps } from './props/AndroidLazyColumn.js'

export type { LazyColumnProps }
export const LazyColumn = createVoltraComponent<LazyColumnProps>('AndroidLazyColumn')
