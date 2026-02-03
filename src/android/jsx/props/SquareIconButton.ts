import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type SquareIconButtonProps = VoltraAndroidBaseProps & {
  /** Whether the button is enabled */
  enabled?: boolean
  /** Icon source */
  icon?: ImageSource
  /** Content description for accessibility */
  contentDescription?: string
  /** Background color */
  backgroundColor?: string
  /** Icon color */
  contentColor?: string
}
