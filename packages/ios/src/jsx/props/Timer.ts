// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type TimerProps = VoltraBaseProps & {
  /** End time in milliseconds since epoch */
  endAtMs?: number
  /** Start time in milliseconds since epoch */
  startAtMs?: number
  /** Duration in milliseconds */
  durationMs?: number
  /** Count direction */
  direction?: 'up' | 'down'
  /** Text formatting style. 'minutes' (iOS 18+) updates live without seconds (e.g. "19 minutes") and falls back to 'timer' on earlier versions */
  textStyle?: 'timer' | 'relative' | 'minutes'
  /** JSON-encoded TextTemplates object with running/completed templates */
  textTemplates?: string
  /** Whether to show hours component when duration exceeds 60 minutes. If false, minutes will exceed 60 (e.g., 94:00 instead of 1:34:00) */
  showHours?: boolean
}
