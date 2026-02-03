import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import type { FilledButtonProps } from './props/FilledButton.js'

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
