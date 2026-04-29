import type { ResolvableExpression } from '@use-voltra/core'
import { createVoltraComponent } from '../../jsx/createVoltraComponent.js'
import { VoltraAndroidTextStyleProp } from '../styles/types.js'
import type { TextProps as GeneratedTextProps } from './props/Text.js'

// Update 'style' and 'children' to use Android text style prop and support ResolvableExpression.
export type TextProps = Omit<GeneratedTextProps, 'style' | 'children'> & {
  style?: VoltraAndroidTextStyleProp
  children?: string | number | boolean | ResolvableExpression<string>
}

export const Text = createVoltraComponent<TextProps>('AndroidText')
