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
  backgroundColor?: string
  /** Content (text/icon) color */
  contentColor?: string
  /** Maximum lines for text */
  maxLines?: number
}
