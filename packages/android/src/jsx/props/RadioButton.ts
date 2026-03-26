import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidTextStyleProp } from '../../styles/types.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type RadioButtonProps = VoltraAndroidBaseProps & {
  /** Whether the radio button is checked */
  checked?: boolean
  /** Text to display next to the radio button */
  text?: string
  /** Style for the text */
  style?: VoltraAndroidTextStyleProp
  /** Color when checked */
  checkedColor?: AndroidColorValue
  /** Color when unchecked */
  uncheckedColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
  /** Whether the radio button is enabled */
  enabled?: boolean
}
