// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ImageProps = VoltraAndroidBaseProps & {
  /** Image source - { assetName: string } for Android drawable resources or preloaded assets */
  source: Record<string, any>
  /** How the image should be resized to fit its container */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  /** Content scale mode (Glance terminology) */
  contentScale?: 'crop' | 'fit' | 'fill-bounds'
  /** Content description for accessibility */
  contentDescription?: string
  /** Opacity (0.0 to 1.0) */
  alpha?: number
  /** Tint color */
  tintColor?: string
}
