import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type FilledButtonProps = VoltraAndroidBaseProps & {
  /** Text to display on the button */
  text: string
  /** Whether the button is enabled */
  enabled?: boolean
  /** Icon to display */
  icon?: ImageSource
  /** Background color */
  backgroundColor?: AndroidColorValue
  /** Content (text/icon) color */
  contentColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
