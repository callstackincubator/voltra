import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { CircleIconButtonProps } from './props/CircleIconButton.js'

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
