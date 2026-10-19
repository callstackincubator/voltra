// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { AndroidColorValue } from '../../dynamic-colors'
import type { VoltraBaseProps } from '../baseProps'

export type AndroidRadioButtonProps = VoltraBaseProps & {
  /** Unique identifier for interaction events */
  id: string
  /** Initial checked state */
  checked?: boolean
  /** Whether the radio button is enabled */
  enabled?: boolean
  /** Text label */
  text?: string
  /** Checked color */
  checkedColor?: AndroidColorValue
  /** Unchecked color */
  uncheckedColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
