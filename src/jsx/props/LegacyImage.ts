// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type LegacyImageProps = VoltraBaseProps & {
  /** Image source - { assetName: string } for Android drawable resources or preloaded assets */
  source: Record<string, any>
  /** How the image should be resized to fit its container */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}
