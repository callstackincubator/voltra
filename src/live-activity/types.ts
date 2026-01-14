import type { ReactNode } from 'react'

import type { VoltraNodeJson } from '../types.js'

/**
 * Live Activity variants - defines content for different states
 */
export type LiveActivityVariants = {
  supplementalActivityFamilies?: ('small' | 'medium' | 'expanded')[]
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

/**
 * Rendered Live Activity variants to JSON.
 */
export type LiveActivityVariantsJson = {
  v: number // Payload version - required for remote updates
  s?: Record<string, unknown>[] // Shared stylesheet for all variants
  e?: VoltraNodeJson[] // Shared elements for deduplication
  ls?: VoltraNodeJson
  ls_background_tint?: string
  isl_keyline_tint?: string
  isl_supp_fam?: ('small' | 'medium' | 'expanded')[]
  isl_exp_c?: VoltraNodeJson
  isl_exp_l?: VoltraNodeJson
  isl_exp_t?: VoltraNodeJson
  isl_exp_b?: VoltraNodeJson
  isl_cmp_l?: VoltraNodeJson
  isl_cmp_t?: VoltraNodeJson
  isl_min?: VoltraNodeJson
}

/**
 * JSON representation of live activity variants for rendering
 */
export type LiveActivityJson = LiveActivityVariantsJson

/**
 * Dismissal policy for Live Activities.
 */
export type DismissalPolicy = 'immediate' | { after: number }
