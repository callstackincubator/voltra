import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ColumnProps = VoltraAndroidBaseProps & {
  /** Spacing between children in dp */
  spacing?: number
  /** Horizontal alignment of children */
  horizontalAlignment?: 'Start' | 'CenterHorizontally' | 'End'
  /** Vertical arrangement */
  verticalArrangement?: 'Top' | 'Center' | 'Bottom' | 'SpaceBetween' | 'SpaceAround' | 'SpaceEvenly'
}
