import type { ImageSource } from './Image.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidTitleBarProps } from './props/AndroidTitleBar.js'

/** Wire payload supports an optional leading icon (not yet in generated AndroidTitleBar props). */
export type TitleBarProps = AndroidTitleBarProps & {
  startIcon?: ImageSource
}
export const TitleBar = createVoltraComponent<TitleBarProps>('AndroidTitleBar', {
  toJSON: (props) => {
    const { startIcon, ...rest } = props

    return {
      ...rest,
      ...(startIcon ? { startIcon: JSON.stringify(startIcon) } : {}),
    }
  },
})
