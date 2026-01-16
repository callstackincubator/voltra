/**
 * Activity-related type definitions for Live Activities
 */

/**
 * Supported supplemental activity families (iOS 18+)
 * These enable Live Activities to appear on watchOS Smart Stack and CarPlay
 */
export type ActivityFamily = 'small'

/**
 * Configuration for Live Activity supplemental families
 */
export interface LiveActivityConfig {
  /**
   * Supplemental activity families to enable (iOS 18+)
   * - 'small': Compact view for watchOS Smart Stack and CarPlay
   *
   * When configured, the .supplementalActivityFamilies() modifier is applied
   * to the ActivityConfiguration with availability check for iOS 18.0+
   */
  supplementalActivityFamilies?: ActivityFamily[]
}
