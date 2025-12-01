import { createVoltraComponent } from './createVoltraComponent'
import type { TextProps } from './props/Text'

export type { TextProps }
export const Text = createVoltraComponent<TextProps>('Text')
