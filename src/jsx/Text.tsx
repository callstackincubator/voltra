import { getModifiersFromTextStyle, VoltraTextStyleProp } from '../styles'
import { createVoltraComponent } from './createVoltraComponent'
import type { TextProps as GeneratedTextProps } from './props/Text'

// Update 'style' at this point, so the generated types remain unchanged.
export type TextProps = Omit<GeneratedTextProps, 'style'> & {
  style?: VoltraTextStyleProp
}

export const Text = createVoltraComponent<TextProps>('Text', {
  toJSON: (props: TextProps) => {
    // Text styles are handled separately, so we need to remove 'style' from the props
    const { style, ...otherProps } = props
    const normalizedProps: TextProps = { ...otherProps }

    if (style) {
      // Convert text styles to modifiers
      const textModifiers = getModifiersFromTextStyle(style)
      normalizedProps.modifiers = [...textModifiers, ...(normalizedProps.modifiers || [])]
    }

    return normalizedProps
  },
})
