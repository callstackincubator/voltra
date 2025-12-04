import { StyleProp, ViewStyle as RNViewStyle } from 'react-native'

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
>

export type VoltraStyleProp = StyleProp<VoltraViewStyle>

// Re-export the main conversion function
export { getModifiersFromStyle } from './converter'
