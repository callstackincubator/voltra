import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ColumnProps = VoltraAndroidBaseProps & {
  /** Horizontal alignment of children */
  horizontalAlignment?: 'start' | 'center-horizontally' | 'end'
  /** Vertical alignment of children */
  verticalAlignment?: 'top' | 'center-vertically' | 'bottom'
}
