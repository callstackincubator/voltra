import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type CircularProgressIndicatorProps = VoltraAndroidBaseProps & {
  /** Current progress value (0.0 to 1.0) */
  progress?: number
  /** Color for the progress indicator */
  color?: string
}
