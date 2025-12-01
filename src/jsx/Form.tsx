import { createVoltraComponent } from './createVoltraComponent'
import type { FormProps } from './props/Form'

export type { FormProps }
export const Form = createVoltraComponent<FormProps>('Form')
