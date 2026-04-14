import type { ResolvableValue } from '../types.js'

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
  flex?: ResolvableValue<number>
  flexGrow?: ResolvableValue<number>
  flexShrink?: ResolvableValue<number>
  flexBasis?: ResolvableValue<number | string>
  alignItems?: ResolvableValue<'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'>
  alignSelf?: ResolvableValue<'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'>
  justifyContent?: ResolvableValue<
    'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  >
  flexDirection?: ResolvableValue<'row' | 'column' | 'row-reverse' | 'column-reverse'>
  gap?: ResolvableValue<number | string>
  minWidth?: ResolvableValue<number | string>
  maxWidth?: ResolvableValue<number | string>
  width?: ResolvableValue<number | string>
  minHeight?: ResolvableValue<number | string>
  maxHeight?: ResolvableValue<number | string>
  height?: ResolvableValue<number | string>
  padding?: ResolvableValue<number | string>
  paddingTop?: ResolvableValue<number | string>
  paddingBottom?: ResolvableValue<number | string>
  paddingLeft?: ResolvableValue<number | string>
  paddingRight?: ResolvableValue<number | string>
  paddingHorizontal?: ResolvableValue<number | string>
  paddingVertical?: ResolvableValue<number | string>
  margin?: ResolvableValue<number | string>
  marginTop?: ResolvableValue<number | string>
  marginBottom?: ResolvableValue<number | string>
  marginLeft?: ResolvableValue<number | string>
  marginRight?: ResolvableValue<number | string>
  marginHorizontal?: ResolvableValue<number | string>
  marginVertical?: ResolvableValue<number | string>
  backgroundColor?: ResolvableValue<string>
  opacity?: ResolvableValue<number>
  borderRadius?: ResolvableValue<number | string>
  borderWidth?: ResolvableValue<number>
  borderColor?: ResolvableValue<string>
  shadowColor?: ResolvableValue<string>
  shadowOffset?: ResolvableValue<{ width: number; height: number }>
  shadowOpacity?: ResolvableValue<number>
  shadowRadius?: ResolvableValue<number>
  overflow?: ResolvableValue<'visible' | 'hidden' | 'scroll'>
  aspectRatio?: ResolvableValue<number | string>
  left?: ResolvableValue<number | string>
  top?: ResolvableValue<number | string>
  position?: ResolvableValue<'absolute' | 'relative' | 'static'>
  zIndex?: ResolvableValue<number>
  transform?: ResolvableValue<VoltraTransform[]>
  glassEffect?: ResolvableValue<'clear' | 'identity' | 'regular' | 'none'>
}

export type VoltraTextStyle = VoltraViewStyle & {
  fontSize?: ResolvableValue<number>
  fontWeight?: ResolvableValue<
    'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  >
  fontFamily?: ResolvableValue<string>
  color?: ResolvableValue<string>
  letterSpacing?: ResolvableValue<number>
  fontVariant?: ResolvableValue<
    ('small-caps' | 'tabular-nums' | 'oldstyle-nums' | 'lining-nums' | 'proportional-nums')[]
  >
  textDecorationLine?: ResolvableValue<'none' | 'underline' | 'line-through' | 'underline line-through'>
  lineHeight?: ResolvableValue<number>
  textAlign?: ResolvableValue<'auto' | 'left' | 'right' | 'center' | 'justify'>
}

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>
