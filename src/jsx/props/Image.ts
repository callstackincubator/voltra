// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0


import type { VoltraBaseProps } from '../baseProps'

export type ImageProps = VoltraBaseProps & {
  /** Image source - either { assetName: string } for asset catalog images or { base64: string } for base64 encoded images */
  source?: Record<string, any>
  /** How the image should be resized to fit its container */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}
