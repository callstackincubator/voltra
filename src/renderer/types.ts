import { ReactNode } from 'react'

import { VoltraJson, VoltraNodeJson } from '../types'

export type VoltraVariants = {
  lockScreen?:
    | ReactNode
    | {
        content?: ReactNode
        activityBackgroundTint?: string
      }
  island?: {
    keylineTint?: string
    expanded?: {
      center?: ReactNode
      leading?: ReactNode
      trailing?: ReactNode
      bottom?: ReactNode
    }
    compact?: {
      leading?: ReactNode
      trailing?: ReactNode
    }
    minimal?: ReactNode
  }
}

export type VoltraVariantRenderer = (node: ReactNode) => VoltraNodeJson
export type VoltraRenderer = (variants: VoltraVariants) => VoltraJson
export type VoltraStringRenderer = (variants: VoltraVariants) => string
