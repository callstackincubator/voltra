// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type ChartProps = VoltraBaseProps & {
  /** Compact mark data encoded from children by toJSON */
  marks?: string
  /** Show or hide the x-axis */
  xAxisVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Configure x-axis grid line style */
  xAxisGridStyle?: Record<string, any>
  /** Show or hide the y-axis */
  yAxisVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Configure y-axis grid line style */
  yAxisGridStyle?: Record<string, any>
  /** Show or hide the chart legend */
  legendVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Map of series name to color string */
  foregroundStyleScale?: Record<string, any>
}
