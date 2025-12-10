import { StyleProp, TextStyle as RNTextStyle, ViewStyle as RNViewStyle } from 'react-native'

// Alignment types for positioning
export type Alignment =
  | 'center'
  | 'leading'
  | 'trailing'
  | 'top'
  | 'bottom'
  | 'topLeading'
  | 'topTrailing'
  | 'bottomLeading'
  | 'bottomTrailing'

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
> & {
  // SwiftUI-native positioning properties
  alignment?: Alignment
  offsetX?: number
  offsetY?: number
}

export type VoltraTextStyle = VoltraViewStyle &
  Pick<RNTextStyle, 'fontSize' | 'fontWeight' | 'color' | 'letterSpacing' | 'fontVariant'>

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>
