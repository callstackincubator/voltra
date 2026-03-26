import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type TitleBarProps = VoltraAndroidBaseProps & {
  /** Title text to display */
  title: string
  /** Start icon source */
  startIcon: ImageSource
  /** Text color - supports hex, rgb, hsl, and named colors */
  textColor?: AndroidColorValue
  /** Icon color - supports hex, rgb, hsl, and named colors */
  iconColor?: AndroidColorValue
  /** Font family for the title */
  fontFamily?: string
}
