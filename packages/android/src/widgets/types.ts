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
  /** The Voltra widget id, as defined in the config plugin (e.g. `"weather"`) */
  widgetType: string
  /**
   * The Android instance id of this placement. Every placed widget has its own, so the same
   * widget placed twice appears twice with different `appWidgetId`s. Pass it to the per-instance
   * configuration APIs to give one placement its own values.
   */
  appWidgetId: number
  /**
   * @deprecated Renamed to `widgetType`, which says what this field holds. Same value.
   */
  name: string
  /**
   * @deprecated Renamed to `appWidgetId`, which says what this field holds — it is the Android
   * instance id, not the Voltra widget id that `widgetId` names everywhere else in this package.
   * Same value.
   */
  widgetId: number
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
