// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { ReactNode } from 'react'

import type { VoltraBaseProps } from '../baseProps'

export type ImageProps = VoltraBaseProps & {
  /** Image source - either { assetName: string } for asset catalog images or { base64: string } for base64 encoded images */
  source?: Record<string, any>
  /** How the image should be resized to fit its container */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  /** iOS 18+ Home Screen widgets only. Controls how the image is rendered when the widget is in an accented (tinted) or vibrant rendering mode. Use 'fullColor' to opt the image out of the system's desaturation so it keeps its original colors on top of the tinted backdrop. No-op outside of accented/vibrant rendering modes. */
  accentedRenderingMode?: 'fullColor' | 'accented' | 'accentedDesaturated' | 'desaturated'
  /** Custom fallback content rendered when the image is missing */
  fallback?: ReactNode
}
