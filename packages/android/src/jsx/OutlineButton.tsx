import { createVoltraComponent } from './createVoltraComponent.js'
import type { OutlineButtonProps } from './props/OutlineButton.js'

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
