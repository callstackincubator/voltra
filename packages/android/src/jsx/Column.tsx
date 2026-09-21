import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidColumnProps as ColumnProps } from './props/AndroidColumn.js'

export type { ColumnProps }
export const Column = createVoltraComponent<ColumnProps>('AndroidColumn', {
  validate: ({ children }) => {
    if (children.length > 10) {
      console.warn(
        `Column supports at most 10 direct children in Jetpack Glance, got ${children.length}. Extra children will be truncated. Use LazyColumn for larger collections.`
      )
    }
  },
})
