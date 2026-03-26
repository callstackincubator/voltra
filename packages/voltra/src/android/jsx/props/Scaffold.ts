import type { AndroidColorValue } from '../../dynamic-colors.js'
import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ScaffoldProps = VoltraAndroidBaseProps & {
  /** Background color for the scaffold - supports hex, rgb, hsl, and named colors */
  backgroundColor?: AndroidColorValue
  /** Horizontal padding */
  horizontalPadding?: number
}
