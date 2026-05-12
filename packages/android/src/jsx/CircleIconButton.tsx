import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidCircleIconButtonProps as CircleIconButtonProps } from './props/AndroidCircleIconButton.js'

export type { CircleIconButtonProps }
export const CircleIconButton = createVoltraComponent<CircleIconButtonProps>('AndroidCircleIconButton', {
  toJSON: (props) => {
    const { icon, ...rest } = props

    return {
      ...rest,
      ...(icon ? { icon: JSON.stringify(icon) } : {}),
    }
  },
})
