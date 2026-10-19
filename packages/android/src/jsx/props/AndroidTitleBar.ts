// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { AndroidColorValue } from '../../dynamic-colors'
import type { VoltraBaseProps } from '../baseProps'

export type AndroidTitleBarProps = VoltraBaseProps & {
  /** Title text */
  title: string
  /** Leading icon */
  startIcon: Record<string, any>
  /** Leading icon tint color */
  iconColor?: AndroidColorValue
  /** Title text color */
  textColor?: AndroidColorValue
  /** Title font family */
  fontFamily?: 'monospace' | 'serif' | 'sans-serif' | 'cursive'
}
