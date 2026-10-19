// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { AndroidColorValue } from '../../dynamic-colors'
import type { VoltraBaseProps } from '../baseProps'

export type AndroidFilledButtonProps = VoltraBaseProps & {
  /** Text to display */
  text: string
  /** Whether the button is enabled */
  enabled?: boolean
  /** Optional icon */
  icon?: Record<string, any>
  /** Background color */
  backgroundColor?: AndroidColorValue
  /** Text/icon color */
  contentColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
