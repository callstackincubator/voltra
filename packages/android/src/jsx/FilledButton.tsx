import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidFilledButtonProps as FilledButtonProps } from './props/AndroidFilledButton.js'

export type { FilledButtonProps }
export const FilledButton = createVoltraComponent<FilledButtonProps>('AndroidFilledButton', {
  toJSON: (props) => {
    const { icon, ...rest } = props

    return {
      ...rest,
      ...(icon ? { icon: JSON.stringify(icon) } : {}),
    }
  },
})
