// 🤖 AUTO-GENERATED from data/components.json
// DO NOT EDIT MANUALLY - Changes will be overwritten
// Schema version: 1.0.0

import type { VoltraBaseProps } from '../baseProps'

export type ImageProps = VoltraBaseProps & {
  /** Image source type */
  imageSourceKind?: 'system' | 'asset' | 'uri' | 'app-group'
  /** Image source identifier or path */
  imageSourceValue?: string
}
