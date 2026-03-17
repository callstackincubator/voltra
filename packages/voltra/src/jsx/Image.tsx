import { createVoltraComponent } from './createVoltraComponent.js'
import type { ImageProps as SwiftImageProps } from './props/Image.js'

export type ImageAssetSource = { assetName: string }
export type ImageBase64Source = { base64: string }
export type ImageSource = ImageAssetSource | ImageBase64Source

export type ImageProps = Omit<SwiftImageProps, 'source'> & {
  source?: ImageSource
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}

export const Image = createVoltraComponent<ImageProps>('Image', {
  toJSON: (props) => {
    const { source, ...rest } = props

    return {
      ...rest,
      ...(source ? { source: JSON.stringify(source) } : {}),
    }
  },
})
