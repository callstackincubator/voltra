import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { TitleBarProps } from './props/TitleBar.js'

export type { TitleBarProps }
export const TitleBar = createVoltraComponent<TitleBarProps>('AndroidTitleBar', {
  toJSON: (props) => {
    const { startIcon, ...rest } = props

    return {
      ...rest,
      ...(startIcon ? { startIcon: JSON.stringify(startIcon) } : {}),
    }
  },
})
