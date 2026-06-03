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
  /** Accessibility description */
  contentDescription?: string
  /** How the image should scale within its bounds */
  contentScale?: 'crop' | 'cover' | 'fit' | 'contain' | 'fill-bounds' | 'stretch'
  /** Image opacity from 0 to 1 */
  alpha?: number
  /** Tint color filter */
  colorFilter?: string
  /** Custom fallback content rendered when the image is missing */
  fallback?: ReactNode
}
