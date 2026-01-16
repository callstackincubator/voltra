import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type CircleIconButtonProps = VoltraAndroidBaseProps & {
  /** Whether the button is enabled */
  enabled?: boolean
  /** Icon source */
  icon?: {
    /** Asset name from drawable resources */
    assetName?: string
    /** Base64 encoded image data */
    base64?: string
  }
  /** Content description for accessibility */
  contentDescription?: string
}
