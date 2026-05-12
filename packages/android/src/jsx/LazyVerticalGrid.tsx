import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidLazyVerticalGridProps as LazyVerticalGridProps } from './props/AndroidLazyVerticalGrid.js'

export type { LazyVerticalGridProps }
export const LazyVerticalGrid = createVoltraComponent<LazyVerticalGridProps>('AndroidLazyVerticalGrid')
