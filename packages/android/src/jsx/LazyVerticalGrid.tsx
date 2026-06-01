import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidLazyVerticalGridProps } from './props/AndroidLazyVerticalGrid.js'

export type LazyVerticalGridColumns =
  | number
  | {
      type: 'fixed'
      count: number
    }
  | {
      type: 'adaptive'
      minSize: number
    }

export type LazyVerticalGridProps = Omit<AndroidLazyVerticalGridProps, 'columns'> & {
  /** Fixed column count or adaptive grid cell configuration */
  columns?: LazyVerticalGridColumns
}

const serializeColumns = (columns: LazyVerticalGridColumns | undefined): number | string | undefined => {
  if (columns === undefined) {
    return undefined
  }

  if (typeof columns === 'number') {
    return columns
  }

  if (columns.type === 'fixed') {
    return columns.count
  }

  return `a:${columns.minSize}`
}

export const LazyVerticalGrid = createVoltraComponent<LazyVerticalGridProps>('AndroidLazyVerticalGrid', {
  toJSON: ({ columns, ...props }) => {
    const serializedColumns = serializeColumns(columns)

    return {
      ...props,
      ...(serializedColumns !== undefined ? { columns: serializedColumns } : {}),
    }
  },
})
