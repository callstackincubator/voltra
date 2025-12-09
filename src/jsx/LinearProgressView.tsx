import { createVoltraComponent } from './createVoltraComponent'
import { ImageSource } from './Image'
import type { LinearProgressViewProps as SwiftLinearProgressViewProps } from './props/LinearProgressView'

export type LinearProgressViewProps = Omit<SwiftLinearProgressViewProps, 'thumbImage'> & {
  thumbImage?: (ImageSource | { symbolName: string }) & { width?: number; height?: number }
}

export const LinearProgressView = createVoltraComponent<LinearProgressViewProps>('LinearProgressView', {
  toJSON: (props) => {
    const { thumbImage, ...rest } = props

    return {
      ...rest,
      ...(thumbImage ? { thumbImage: JSON.stringify(thumbImage) } : {}),
    }
  },
})
