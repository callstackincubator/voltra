// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type ProgressViewProps = VoltraBaseProps & {
  /** Current progress value */
  defaultValue?: number
  /** Maximum progress value */
  maximumValue?: number
  /** Legacy: End time for timer-based progress */
  timerEndDateInMilliseconds?: number
  /** End time in milliseconds since epoch */
  endAtMs?: number
  /** Start time in milliseconds since epoch */
  startAtMs?: number
  /** Progress view style */
  mode?: 'bar' | 'circular'
}
