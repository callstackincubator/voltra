/**
 * Android-specific style types for Voltra components.
 * These types mirror the supported properties in the Android implementation (Glance).
 */

export type StyleProp<T> = T | T[] | null | undefined | false

export type VoltraAndroidViewStyle = {
  /** Width of the component. Supports fixed numbers (dp) or "100%" to fill. */
  width?: number | string
  /** Height of the component. Supports fixed numbers (dp) or "100%" to fill. */
  height?: number | string
  /** Minimum width (Note: Limited support in Glance) */
  minWidth?: number
  /** Maximum width (Note: Limited support in Glance) */
  maxWidth?: number
  /** Minimum height (Note: Limited support in Glance) */
  minHeight?: number
  /** Maximum height (Note: Limited support in Glance) */
  maxHeight?: number

  /** Flex weight for the component (maps to .defaultWeight() in Glance) */
  flex?: number
  /** Flex grow weight for the component (maps to .defaultWeight() in Glance) */
  flexGrow?: number

  /** Aspect ratio of the component (Note: Not supported in Glance) */
  aspectRatio?: number

  /** Inner padding for the component */
  padding?: number
  paddingTop?: number
  paddingBottom?: number
  paddingLeft?: number
  paddingRight?: number
  paddingVertical?: number
  paddingHorizontal?: number

  /** Outer margin for the component (Note: Often implemented as padding in Glance) */
  margin?: number
  marginTop?: number
  marginBottom?: number
  marginLeft?: number
  marginRight?: number
  marginVertical?: number
  marginHorizontal?: number

  /** Gap between children (Note: Supported by specific layouts like LazyColumn/Row) */
  gap?: number

  /** Alignment of children along the cross axis */
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  /** Alignment of children along the main axis */
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'

  /** Absolute positioning from the left (maps to Offset in Glance) */
  left?: number
  /** Absolute positioning from the top (maps to Offset in Glance) */
  top?: number
  /** Z-index for layering (Note: Limited support in Glance) */
  zIndex?: number

  /** Background color of the component */
  backgroundColor?: string
  /** Corner radius for the component (requires Android 12+) */
  borderRadius?: number
  /** Border width (Note: Not yet implemented in Glance) */
  borderWidth?: number
  /** Border color (Note: Not yet implemented in Glance) */
  borderColor?: string

  /** Opacity of the component (Note: Not supported in Glance - apply alpha to colors instead) */
  opacity?: number
  /** Controls if content is clipped to the border (maps to clipToOutline) */
  overflow?: 'visible' | 'hidden'

  /** Controls layout display mode */
  display?: 'none' | 'flex'
  /** Controls component visibility */
  visibility?: 'visible' | 'hidden' | 'invisible'

  /** Transform effects (Note: Not supported in Glance) */
  transform?: ({ rotate: string } | { rotateZ: string } | { scale: number } | { scaleX: number } | { scaleY: number })[]

  /** Shadow properties (Note: Not supported in Glance) */
  shadowColor?: string
  shadowOffset?: { width: number; height: number }
  shadowOpacity?: number
  shadowRadius?: number

  /** Glass effect (iOS-specific, included for API compatibility) */
  glassEffect?: 'clear' | 'identity' | 'regular' | 'none'
}

export type VoltraAndroidTextStyle = VoltraAndroidViewStyle & {
  /** Text color */
  color?: string
  /** Font size in sp */
  fontSize?: number
  /** Font weight */
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | number
  /** Text alignment */
  textAlign?: 'auto' | 'left' | 'right' | 'center' | 'justify' | 'start' | 'end'
  /** Text decoration line */
  textDecorationLine?: 'none' | 'underline' | 'line-through' | 'underline line-through'
  /** Line height (maps to line spacing in Glance) */
  lineHeight?: number
  /** Letter spacing (Note: Not supported in Glance) */
  letterSpacing?: number
  /** Font variants (Note: Not supported in Glance) */
  fontVariant?: ('small-caps' | 'tabular-nums')[]
  /** Maximum number of lines to display (maps to lineLimit) */
  numberOfLines?: number
}

export type VoltraAndroidStyleProp = StyleProp<VoltraAndroidViewStyle>
export type VoltraAndroidTextStyleProp = StyleProp<VoltraAndroidTextStyle>
