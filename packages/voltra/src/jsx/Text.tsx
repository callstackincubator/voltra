import { VoltraTextStyleProp } from '../styles/index.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { TextProps as GeneratedTextProps } from './props/Text.js'

// Update 'style' at this point, so the generated types remain unchanged.
export type TextProps = Omit<GeneratedTextProps, 'style'> & {
  style?: VoltraTextStyleProp
}

export const Text = createVoltraComponent<TextProps>('Text')
