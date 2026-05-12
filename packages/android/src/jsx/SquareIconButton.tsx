import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidSquareIconButtonProps as SquareIconButtonProps } from './props/AndroidSquareIconButton.js'

export type { SquareIconButtonProps }
export const SquareIconButton = createVoltraComponent<SquareIconButtonProps>('AndroidSquareIconButton', {
  toJSON: (props) => {
    const { icon, ...rest } = props

    return {
      ...rest,
      ...(icon ? { icon: JSON.stringify(icon) } : {}),
    }
  },
})
