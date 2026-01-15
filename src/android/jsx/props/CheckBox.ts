import type { VoltraAndroidTextStyleProp } from '../../styles/types.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type CheckBoxProps = VoltraAndroidBaseProps & {
  /** Whether the checkbox is checked */
  checked?: boolean
  /** Text to display next to the checkbox */
  text?: string
  /** Style for the text */
  style?: VoltraAndroidTextStyleProp
  /** Color when checked */
  checkedColor?: string
  /** Color when unchecked */
  uncheckedColor?: string
  /** Maximum lines for text */
  maxLines?: number
}
