/* eslint-disable */
// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { ReactNode } from 'react'

import type { VoltraBaseProps } from '../baseProps'

export type LinearProgressViewProps = VoltraBaseProps & {
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
  /** Color for the track (background) of the progress bar */
  trackColor?: string
  /** Color for the progress fill */
  progressColor?: string
  /** Corner radius for the progress bar */
  cornerRadius?: number
  /** Explicit height for the progress bar */
  height?: number
  /** Custom thumb component to display at progress position */
  thumb?: ReactNode
}
