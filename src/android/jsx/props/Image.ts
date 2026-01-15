import type { VoltraAndroidBaseProps } from '../baseProps.js'

export type ImageProps = VoltraAndroidBaseProps & {
  /** Image source */
  source?: {
    /** Asset name from drawable resources */
    assetName?: string
    /** Base64 encoded image data */
    base64?: string
  }
  /** Content scale mode */
  contentScale?: 'Crop' | 'Fit' | 'FillBounds' | 'FillHeight' | 'FillWidth' | 'Inside' | 'None'
}
