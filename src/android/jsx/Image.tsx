import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { ImageProps } from './props/Image.js'

export type { ImageProps }
export type ImageSource = { assetName: string } | { base64: string }

export type ImagePropsWithSource = Omit<ImageProps, 'source'> & {
  source: ImageSource
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center'
}

export const Image = createVoltraComponent<ImagePropsWithSource>('AndroidImage', {
  toJSON: (props) => {
    const { source, ...rest } = props

    return {
      ...rest,
      source: JSON.stringify(source),
    }
  },
})
