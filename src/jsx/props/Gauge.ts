// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { ReactNode } from 'react'

import type { VoltraBaseProps } from '../baseProps'

export type GaugeProps = VoltraBaseProps & {
  /** Current gauge value */
  value?: number
  /** Minimum value of the gauge range */
  minimumValue?: number
  /** Maximum value of the gauge range */
  maximumValue?: number
  /** End time in milliseconds since epoch */
  endAtMs?: number
  /** Start time in milliseconds since epoch */
  startAtMs?: number
  /** Tint color for the gauge */
  tintColor?: string
  /** Visual style of the gauge */
  gaugeStyle?: 'automatic' | 'accessoryLinear' | 'accessoryLinearCapacity' | 'accessoryCircular' | 'accessoryCircularCapacity' | 'linearCapacity'
  /** Custom text for current value label */
  currentValueLabel?: ReactNode
  /** Text for minimum value label */
  minimumValueLabel?: ReactNode
  /** Text for maximum value label */
  maximumValueLabel?: ReactNode
}
