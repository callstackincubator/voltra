// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { AndroidColorValue } from '../../dynamic-colors'
import type { VoltraBaseProps } from '../baseProps'

export type AndroidArcProgressIndicatorProps = VoltraBaseProps & {
  /** Fill fraction from 0 to 1, clamped */
  progress?: number
  /** Stroke color of the filled arc */
  color?: AndroidColorValue
  /** Stroke color of the unfilled arc; transparent hides the track */
  trackColor?: AndroidColorValue
  /** Stroke width in dp of both arcs */
  strokeWidth?: number
  /** Angle in degrees where the arc begins; 0 is 3 o'clock, positive is clockwise */
  startAngle?: number
  /** Total angular length of the track in degrees; 360 makes a closed ring */
  sweepAngle?: number
  /** End shape of both arcs */
  lineCap?: 'round' | 'butt'
  /** Sweep gradient colors along the filled arc, from startAngle; overrides color */
  gradientColors?: string
}
