import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type LazyVerticalGridProps = VoltraAndroidBaseProps & {
  /** Number of columns or 'adaptive' for adaptive grid */
  columns: number | 'adaptive'
  /** Minimum size (in dp) for adaptive grid mode */
  minSize?: number
  /** Horizontal alignment of children */
  horizontalAlignment?: 'start' | 'center-horizontally' | 'end'
  /** Vertical alignment of children */
  verticalAlignment?: 'top' | 'center' | 'bottom'
}
