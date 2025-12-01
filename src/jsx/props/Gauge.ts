// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type GaugeProps = VoltraBaseProps & {
  /** Current gauge value (0-1 range) */
  defaultValue?: number
  /** End time in milliseconds since epoch */
  endAtMs?: number
  /** Start time in milliseconds since epoch */
  startAtMs?: number
  /** Show the value label */
  showValueLabel?: boolean
  /** Hide the value label */
  hideValueLabel?: boolean
}
