// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type ChartProps = VoltraBaseProps & {
  /** Compact mark data encoded from children by toJSON */
  marks?: string
  /** Show or hide the x-axis */
  xAxisVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Show or hide the y-axis */
  yAxisVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Show or hide the chart legend */
  legendVisibility?: 'automatic' | 'visible' | 'hidden'
  /** Map of series name to color string */
  foregroundStyleScale?: Record<string, any>
  /** Enable scrolling on the given axis */
  chartScrollableAxes?: 'horizontal' | 'vertical'
}
