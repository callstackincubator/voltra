type StyleProp<T> = T | T[] | null | undefined | false

type VoltraTransform =
  | { rotate: string }
  | { rotateX: string }
  | { rotateY: string }
  | { rotateZ: string }
  | { scale: number }
  | { scaleX: number }
  | { scaleY: number }
  | { translateX: number }
  | { translateY: number }
  | { skewX: string }
  | { skewY: string }

export type VoltraViewStyle = {
  flex?: number
  flexGrow?: number
  flexShrink?: number
  flexBasis?: number | string
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  gap?: number | string
  minWidth?: number | string
  maxWidth?: number | string
  width?: number | string
  minHeight?: number | string
  maxHeight?: number | string
  height?: number | string
  padding?: number | string
  paddingTop?: number | string
  paddingBottom?: number | string
  paddingLeft?: number | string
  paddingRight?: number | string
  paddingHorizontal?: number | string
  paddingVertical?: number | string
  margin?: number | string
  marginTop?: number | string
  marginBottom?: number | string
  marginLeft?: number | string
  marginRight?: number | string
  marginHorizontal?: number | string
  marginVertical?: number | string
  backgroundColor?: string
  opacity?: number
  borderRadius?: number | string
  borderWidth?: number
  borderColor?: string
  shadowColor?: string
  shadowOffset?: { width: number; height: number }
  shadowOpacity?: number
  shadowRadius?: number
  overflow?: 'visible' | 'hidden' | 'scroll'
  aspectRatio?: number | string
  left?: number | string
  top?: number | string
  position?: 'absolute' | 'relative' | 'static'
  zIndex?: number
  transform?: VoltraTransform[]
  glassEffect?: 'clear' | 'identity' | 'regular' | 'none'
}

export type VoltraTextStyle = VoltraViewStyle & {
  fontSize?: number
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  fontFamily?: string
  color?: string
  letterSpacing?: number
  fontVariant?: ('small-caps' | 'tabular-nums' | 'oldstyle-nums' | 'lining-nums' | 'proportional-nums')[]
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  lineHeight?: number
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify'
}

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>
