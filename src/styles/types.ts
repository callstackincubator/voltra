import type { StyleProp, TextStyle as RNTextStyle, ViewStyle as RNViewStyle } from 'react-native'

export type VoltraViewStyle = Pick<
  RNViewStyle,
  | 'flex'
  | 'flexGrow'
  | 'minWidth'
  | 'maxWidth'
  | 'width'
  | 'minHeight'
  | 'maxHeight'
  | 'height'
  | 'padding'
  | 'paddingTop'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingHorizontal'
  | 'paddingVertical'
  | 'margin'
  | 'marginTop'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'marginHorizontal'
  | 'marginVertical'
  | 'backgroundColor'
  | 'opacity'
  | 'borderRadius'
  | 'borderWidth'
  | 'borderColor'
  | 'shadowColor'
  | 'shadowOffset'
  | 'shadowOpacity'
  | 'shadowRadius'
  | 'overflow'
  | 'aspectRatio'
  | 'left'
  | 'top'
  | 'position'
  | 'zIndex'
  | 'transform'
> & {
  glassEffect?: 'clear' | 'identity' | 'regular' | 'none'
}

export type VoltraTextStyle = VoltraViewStyle &
  Pick<
    RNTextStyle,
    | 'fontSize'
    | 'fontWeight'
    | 'fontFamily'
    | 'color'
    | 'letterSpacing'
    | 'fontVariant'
    | 'textDecorationLine'
    | 'lineHeight'
  >

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>
