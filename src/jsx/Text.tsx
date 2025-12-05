import { VoltraTextStyleProp } from '../styles'
import { createVoltraComponent } from './createVoltraComponent'
import type { TextProps as GeneratedTextProps } from './props/Text'

// Update 'style' at this point, so the generated types remain unchanged.
export type TextProps = Omit<GeneratedTextProps, 'style'> & {
  style?: VoltraTextStyleProp
}

export const Text = createVoltraComponent<TextProps>('Text')
