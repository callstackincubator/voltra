import { ReactNode } from 'react'

import { VoltraJson, VoltraNodeJson } from '../types'

export type VoltraVariants = {
  lockScreen?: ReactNode
  island?: {
    expanded?: ReactNode
    compact?: ReactNode
    compactLeading?: ReactNode
    compactTrailing?: ReactNode
    minimal?: ReactNode
  }
}

export type VoltraVariantRenderer = (node: ReactNode) => VoltraNodeJson
export type VoltraRenderer = (variants: VoltraVariants) => VoltraJson
export type VoltraStringRenderer = (variants: VoltraVariants) => string
