import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type TextProps = VoltraAndroidBaseProps & {
  /** Maximum number of lines to display */
  maxLines?: number
  /**
   * When true, renders text as a bitmap image instead of using Glance's native Text.
   * This enables custom font support via `fontFamily` in the style prop.
   * The font file should be placed in `android/app/src/main/assets/fonts/<fontFamily>.ttf`.
   */
  renderAsBitmap?: boolean
}
