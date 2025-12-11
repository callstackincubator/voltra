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
> & {
  // Aspect ratio
  aspectRatio?: number
  // Frame constraints
  minWidth?: number
  maxWidth?: number | 'infinity'
  minHeight?: number
  maxHeight?: number | 'infinity'
  // Flex grow width (sets maxWidth to infinity)
  flexGrowWidth?: boolean
  // Fixed size
  fixedSizeHorizontal?: boolean
  fixedSizeVertical?: boolean
  // Layout priority
  layoutPriority?: number
  // Z-index for layering
  zIndex?: number
  // Offset for fine-tuning position
  offsetX?: number
  offsetY?: number
  // Absolute position (overrides everything else)
  absolutePosition?: { x: number; y: number }
}

export type VoltraTextStyle = VoltraViewStyle &
  Pick<RNTextStyle, 'fontSize' | 'fontWeight' | 'color' | 'letterSpacing' | 'fontVariant'>

export type VoltraStyleProp = StyleProp<VoltraViewStyle>
export type VoltraTextStyleProp = StyleProp<VoltraTextStyle>
