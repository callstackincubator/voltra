import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type RowProps = VoltraAndroidBaseProps & {
  /** Vertical alignment of children */
  verticalAlignment?: 'top' | 'center-vertically' | 'bottom'
  /** Horizontal alignment of children */
  horizontalAlignment?: 'start' | 'center-horizontally' | 'end'
}
