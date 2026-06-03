import type { ImageSource } from './Image.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidTitleBarProps } from './props/AndroidTitleBar.js'

export type TitleBarProps = Omit<AndroidTitleBarProps, 'startIcon'> & {
  startIcon: ImageSource
}

export const TitleBar = createVoltraComponent<TitleBarProps>('AndroidTitleBar', {
  toJSON: (props) => {
    const { startIcon, ...rest } = props

    return {
      ...rest,
      startIcon: JSON.stringify(startIcon),
    }
  },
})
