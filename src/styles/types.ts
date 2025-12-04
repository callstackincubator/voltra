import { StyleProp, TextStyle as RNTextStyle, ViewStyle as RNViewStyle } from 'react-native'

export type VoltraViewStyle = Pick<
  RNViewStyle,
  | 'width'
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
  | 'flex'
  | 'flexGrow'
  | 'flexShrink'
>

export type VoltraTextStyle = VoltraViewStyle & Pick<RNTextStyle, 'fontSize' | 'fontWeight' | 'color' | 'letterSpacing'>

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>

// Re-export the main conversion functions
export { getModifiersFromLayoutStyle, getModifiersFromTextStyle } from './converter'
