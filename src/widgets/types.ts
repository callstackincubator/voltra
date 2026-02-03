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
 * Information about an active widget configuration on iOS
 */
export interface WidgetInfo {
  /** The name (ID) of the widget as defined in the config plugin */
  name: string
  /** The 'kind' string defined in your WidgetExtension */
  kind: string
  /** The visual size of the widget */
  family: WidgetFamily
}

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
