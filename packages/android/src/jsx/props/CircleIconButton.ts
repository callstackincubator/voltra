import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type CircleIconButtonProps = VoltraAndroidBaseProps & {
  /** Whether the button is enabled */
  enabled?: boolean
  /** Icon source */
  icon?: ImageSource
  /** Content description for accessibility */
  contentDescription?: string
  /** Background color */
  backgroundColor?: AndroidColorValue
  /** Icon color */
  contentColor?: AndroidColorValue
}
