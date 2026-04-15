import type { ResolvableExpression } from '@use-voltra/core'
import { VoltraTextStyleProp } from '../styles/index.js'
import { createVoltraComponent } from './createVoltraComponent.js'
import type { TextProps as GeneratedTextProps } from './props/Text.js'

// Update 'style' and 'children' at this point, so the generated types remain unchanged.
export type TextProps = Omit<GeneratedTextProps, 'style' | 'children'> & {
  style?: VoltraTextStyleProp
  children?: string | number | boolean | ResolvableExpression<string>
}

export const Text = createVoltraComponent<TextProps>('Text')
