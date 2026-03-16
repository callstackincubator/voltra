import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type LazyColumnProps = VoltraAndroidBaseProps & {
  /** Horizontal alignment of children */
  horizontalAlignment?: 'start' | 'center-horizontally' | 'end'
}
