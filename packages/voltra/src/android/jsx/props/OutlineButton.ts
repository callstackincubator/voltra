import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type OutlineButtonProps = VoltraAndroidBaseProps & {
  /** Text to display on the button */
  text: string
  /** Whether the button is enabled */
  enabled?: boolean
  /** Icon to display */
  icon?: ImageSource
  /** Content (text/icon) color */
  contentColor?: AndroidColorValue
  /** Maximum lines for text */
  maxLines?: number
}
