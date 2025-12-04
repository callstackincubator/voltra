import { createVoltraComponent } from './createVoltraComponent'
import type { ImageProps as SwiftImageProps } from './props/Image'

export type ImageProps = SwiftImageProps

export const Image = createVoltraComponent<ImageProps>('Image')
