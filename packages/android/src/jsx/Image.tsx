import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidImageProps } from './props/AndroidImage.js'

export type ImageSource = { assetName: string } | { base64: string }

export type ImageProps = Omit<AndroidImageProps, 'source'> & {
  source: ImageSource
}

export type ImagePropsWithSource = ImageProps

export const Image = createVoltraComponent<ImageProps>('AndroidImage', {
  toJSON: (props) => {
    const { source, ...rest } = props

    return {
      ...rest,
      source: JSON.stringify(source),
    }
  },
})
