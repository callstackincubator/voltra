import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { SquareIconButtonProps } from './props/SquareIconButton.js'

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
