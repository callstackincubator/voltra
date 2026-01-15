import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type RowProps = VoltraAndroidBaseProps & {
  /** Spacing between children in dp */
  spacing?: number
  /** Vertical alignment of children */
  verticalAlignment?: 'Top' | 'CenterVertically' | 'Bottom'
  /** Horizontal arrangement */
  horizontalArrangement?: 'Start' | 'Center' | 'End' | 'SpaceBetween' | 'SpaceAround' | 'SpaceEvenly'
}
