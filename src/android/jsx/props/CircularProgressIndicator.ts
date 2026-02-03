import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type CircularProgressIndicatorProps = VoltraAndroidBaseProps & {
  /**
   * Current progress value (0.0 to 1.0)
   * @note Android Glance only supports indeterminate mode - this prop is ignored on Android.
   * Use LinearProgressIndicator if you need determinate progress on Android.
   */
  progress?: number
  /** Color for the progress indicator */
  color?: string
}
