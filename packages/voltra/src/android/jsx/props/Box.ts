import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type BoxProps = VoltraAndroidBaseProps & {
  /** Content alignment within the box */
  contentAlignment?:
    | 'top-start'
    | 'top-center'
    | 'top-end'
    | 'center-start'
    | 'center'
    | 'center-end'
    | 'bottom-start'
    | 'bottom-center'
    | 'bottom-end'
}
