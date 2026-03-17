import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import { VoltraAndroidTextStyleProp } from '../styles/types.js'
import type { TextProps as GeneratedTextProps } from './props/Text.js'

// Update 'style' to use Android text style prop
export type TextProps = Omit<GeneratedTextProps, 'style'> & {
  style?: VoltraAndroidTextStyleProp
}

export const Text = createVoltraComponent<TextProps>('AndroidText')
