// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { ReactNode } from 'react'

import type { VoltraBaseProps } from '../baseProps'

export type AndroidImageProps = VoltraBaseProps & {
  /** Image source */
  source: Record<string, any>
  /** Resizing mode */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
  /** Custom fallback content rendered when the image is missing */
  fallback?: ReactNode
}
