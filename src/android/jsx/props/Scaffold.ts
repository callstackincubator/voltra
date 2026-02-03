import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ScaffoldProps = VoltraAndroidBaseProps & {
  /** Background color for the scaffold - supports hex, rgb, hsl, and named colors */
  backgroundColor?: string
  /** Horizontal padding */
  horizontalPadding?: number
}
