// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0


import type { VoltraBaseProps } from '../baseProps'

export type CircularProgressViewProps = VoltraBaseProps & {
  /** Current progress value */
  value?: number
  /** Whether to count down instead of up */
  countDown?: boolean
  /** Maximum progress value */
  maximumValue?: number
  /** End time in milliseconds since epoch */
  endAtMs?: number
  /** Start time in milliseconds since epoch */
  startAtMs?: number
  /** Color for the track (background) of the circular progress indicator */
  trackColor?: string
  /** Color for the progress fill */
  progressColor?: string
  /** Width of the stroke line */
  lineWidth?: number
}
