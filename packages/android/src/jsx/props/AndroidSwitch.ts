// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { AndroidColorValue } from '../../dynamic-colors'
import type { VoltraBaseProps } from '../baseProps'

export type AndroidSwitchProps = VoltraBaseProps & {
  /** Unique identifier for interaction events */
  id: string
  /** Initial checked state */
  checked?: boolean
  /** Text label */
  text?: string
  /** Checked thumb color */
  thumbCheckedColor?: AndroidColorValue
  /** Unchecked thumb color */
  thumbUncheckedColor?: AndroidColorValue
  /** Checked track color */
  trackCheckedColor?: AndroidColorValue
  /** Unchecked track color */
  trackUncheckedColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
