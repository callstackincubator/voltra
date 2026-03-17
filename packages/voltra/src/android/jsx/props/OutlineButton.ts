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
  contentColor?: string
  /** Maximum lines for text */
  maxLines?: number
}
