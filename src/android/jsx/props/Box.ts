import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type BoxProps = VoltraAndroidBaseProps & {
  /** Content alignment within the box */
  contentAlignment?:
    | 'TopStart'
    | 'TopCenter'
    | 'TopEnd'
    | 'CenterStart'
    | 'Center'
    | 'CenterEnd'
    | 'BottomStart'
    | 'BottomCenter'
    | 'BottomEnd'
}
