import { VoltraAndroidTextStyleProp } from '../styles/types.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { AndroidTextProps } from './props/AndroidText.js'

// Update 'style' to use Android text style prop
export type TextProps = Omit<AndroidTextProps, 'style'> & {
  style?: VoltraAndroidTextStyleProp
}

export const Text = createVoltraComponent<TextProps>('AndroidText')
