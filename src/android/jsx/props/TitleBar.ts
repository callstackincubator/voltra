import type { VoltraAndroidBaseProps } from '../baseProps.js'
import type { ImageSource } from '../Image.js'

export type TitleBarProps = VoltraAndroidBaseProps & {
  /** Title text to display */
  title: string
  /** Start icon source */
  startIcon: ImageSource
  /** Text color - supports hex, rgb, hsl, and named colors */
  textColor?: string
  /** Icon color - supports hex, rgb, hsl, and named colors */
  iconColor?: string
  /** Font family for the title */
  fontFamily?: string
}
