import type { ReactNode } from 'react'

/**
 * Widget size families supported by iOS
 */
export type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline'

/**
 * Widget variants following the same pattern as LiveActivityVariants.
 * Each key corresponds to a widget family.
 */
export type WidgetVariants = Partial<Record<WidgetFamily, ReactNode>>

/**
 * Timeline reload policy determines when iOS should request a new timeline
 */
export type TimelineReloadPolicy = { type: 'never' } | { type: 'atEnd' } | { type: 'after'; date: Date }

/**
 * A single entry in a widget timeline with scheduled display time and content
 */
export type ScheduledWidgetEntry = {
  /**
   * When this content should be displayed
   */
  date: Date
  /**
   * Widget content for different size families
   */
  variants: WidgetVariants
  /**
   * Optional deep link URL for this specific entry
   */
  deepLinkUrl?: string
}

/**
 * Options for scheduling a widget timeline
 */
export type ScheduleWidgetOptions = {
  /**
   * Timeline reload policy - determines when iOS requests a new timeline.
   * Defaults to { type: 'never' }
   */
  policy?: TimelineReloadPolicy
}
