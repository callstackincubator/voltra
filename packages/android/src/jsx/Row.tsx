import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidRowProps as RowProps } from './props/AndroidRow.js'

export type { RowProps }
export const Row = createVoltraComponent<RowProps>('AndroidRow', {
  validate: ({ children }) => {
    if (children.length > 10) {
      console.warn(
        `Row supports at most 10 direct children in Jetpack Glance, got ${children.length}. Extra children will be truncated. Use LazyColumn for larger collections.`
      )
    }
  },
})
