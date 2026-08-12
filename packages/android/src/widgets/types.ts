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
 * Information about an active widget instance on Android
 */
export type WidgetInfo = {
  /** The Android appWidgetId identifying this specific placed widget instance. */
  appWidgetId: number
  /** The Voltra widget id (the `id` from the config plugin), shared by all instances of this type. */
  widgetType: string
  /** Deprecated: confusingly named — this is the appWidgetId. Use `appWidgetId`. */
  widgetId: number
  /** Deprecated: confusingly named — this is the Voltra widget id. Use `widgetType`. */
  name: string
  /** The class name of the provider (e.g., ".WeatherWidget") */
  providerClassName: string
  /** Current labeling associated with the widget */
  label: string
  /** Dimensions in dp as reported by the system */
  width: number
  height: number
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
