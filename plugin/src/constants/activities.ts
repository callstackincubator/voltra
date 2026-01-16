import type { ActivityFamily } from '../types'

/**
 * Activity-related constants for the Voltra plugin
 */

/** Default supplemental activity families when not specified */
export const DEFAULT_ACTIVITY_FAMILIES: ActivityFamily[] = ['small']

/** Maps JS activity family names to SwiftUI ActivityFamily enum cases */
export const ACTIVITY_FAMILY_MAP: Record<ActivityFamily, string> = {
  small: '.small',
}
