import type { ReactNode } from 'react'

/**
 * Size breakpoint for Android widgets.
 * Represents width x height in dp.
 */
export type AndroidWidgetSize = {
  width: number
  height: number
}

/**
 * A single size variant with its breakpoint and content.
 */
export type AndroidWidgetSizeVariant = {
  size: AndroidWidgetSize
  content: ReactNode
}

/**
 * Widget variants using size-based breakpoints.
 * Android picks the best matching variant based on widget dimensions.
 *
 * @example
 * ```tsx
 * const variants: AndroidWidgetVariants = [
 *   { size: { width: 150, height: 100 }, content: <SmallWidget /> },
 *   { size: { width: 150, height: 200 }, content: <TallWidget /> },
 *   { size: { width: 215, height: 100 }, content: <WideWidget /> },
 * ]
 * ```
 */
export type AndroidWidgetVariants = AndroidWidgetSizeVariant[]

/**
 * Options for updating an Android widget
 */
export type UpdateAndroidWidgetOptions = {
  /**
   * URL to open when the widget is tapped.
   * Can be a full URL (e.g., "myapp://screen/details")
   * or a path that will be prefixed with your app's URL scheme.
   */
  deepLinkUrl?: string
}
