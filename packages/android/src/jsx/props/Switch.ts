import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidTextStyleProp } from '../../styles/types.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type SwitchProps = VoltraAndroidBaseProps & {
  /** Whether the switch is checked */
  checked?: boolean
  /** Text to display next to the switch */
  text?: string
  /** Style for the text */
  style?: VoltraAndroidTextStyleProp
  /** Thumb color when checked */
  thumbCheckedColor?: AndroidColorValue
  /** Thumb color when unchecked */
  thumbUncheckedColor?: AndroidColorValue
  /** Track color when checked */
  trackCheckedColor?: AndroidColorValue
  /** Track color when unchecked */
  trackUncheckedColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
