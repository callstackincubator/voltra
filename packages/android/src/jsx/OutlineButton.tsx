import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidOutlineButtonProps as OutlineButtonProps } from './props/AndroidOutlineButton.js'

export type { OutlineButtonProps }
export const OutlineButton = createVoltraComponent<OutlineButtonProps>('AndroidOutlineButton', {
  toJSON: (props) => {
    const { icon, ...rest } = props

    return {
      ...rest,
      ...(icon ? { icon: JSON.stringify(icon) } : {}),
    }
  },
})
