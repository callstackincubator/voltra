// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type SymbolProps = VoltraBaseProps & {
  /** SF Symbol name */
  name?: string
  /** Symbol rendering type */
  type?: 'monochrome' | 'hierarchical' | 'palette' | 'multicolor'
  /** Symbol scale */
  scale?: 'default' | 'unspecified' | 'small' | 'medium' | 'large'
  /** Symbol weight */
  weight?: 'unspecified' | 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black'
  /** Symbol size in points */
  size?: number
  /** Tint color for the symbol */
  tintColor?: string
  /** Pipe-separated colors for palette type */
  colors?: string
  /** Image resize mode */
  resizeMode?: string
  /** JSON-encoded animation specification */
  animationSpec?: string
}
