// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type TextProps = VoltraBaseProps & {
  /** Maximum number of lines to display */
  numberOfLines?: number
  /** Text alignment for multiline text */
  multilineTextAlignment?: 'left' | 'center' | 'right' | 'auto'
  /** Specifies whether the font should be scaled down automatically to fit given style constraints */
  adjustsFontSizeToFit?: boolean
  /** Specifies the smallest possible scale factor that the font can use */
  minimumFontScale?: number
  /** Whether the font should scale with system accessibility settings */
  allowFontScaling?: boolean
  /** Limits how much the font can grow via Dynamic Type */
  maxFontSizeMultiplier?: number
}
