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
  /** Display mode */
  mode?: 'text' | 'bar' | 'circular'
  /** Count direction */
  direction?: 'up' | 'down'
  /** Hide timer when complete */
  autoHideOnEnd?: boolean
  /** Text formatting style */
  textStyle?: 'timer' | 'relative'
  /** JSON-encoded TextTemplates object with running/completed templates */
  textTemplates?: string
  /** JSON-encoded mode-specific modifiers map */
  modeOrderedModifiers?: string
  /** JSON-encoded track colors map */
  modeTrackColors?: string
  /** JSON-encoded tint colors map */
  modeTintColors?: string
}
