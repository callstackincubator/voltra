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
  thumbCheckedColor?: string
  /** Thumb color when unchecked */
  thumbUncheckedColor?: string
  /** Track color when checked */
  trackCheckedColor?: string
  /** Track color when unchecked */
  trackUncheckedColor?: string
  /** Maximum lines for text */
  maxLines?: number
}
