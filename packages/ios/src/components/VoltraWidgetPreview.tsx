import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

import { WidgetFamily } from '../widgets/types.js'
import { VoltraView, VoltraViewProps } from './VoltraView.js'

/**
 * Dimensions for iOS widget families in points (approximate)
 * Based on iPhone 14 Pro/15 Pro dimensions
 */
const WIDGET_DIMENSIONS: Record<WidgetFamily, { width: number; height: number }> = {
  systemSmall: { width: 170, height: 170 },
  systemMedium: { width: 364, height: 170 },
  systemLarge: { width: 364, height: 382 },
  systemExtraLarge: { width: 364, height: 768 }, // Approximate for iPad
  accessoryCircular: { width: 76, height: 76 },
  accessoryRectangular: { width: 172, height: 76 },
  accessoryInline: { width: 172, height: 40 }, // Approximate
}

export type VoltraWidgetPreviewProps = Omit<VoltraViewProps, 'style'> & {
  /**
   * Widget family size to preview
   */
  family: WidgetFamily
  /**
   * Additional styles to apply on top of the widget dimensions
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A preview component that renders Voltra JSX content at the exact dimensions
 * of a specific iOS widget family. Useful for testing widget layouts.
 *
 * This component extends VoltraView but automatically sets the width and height
 * to match the specified widget family's dimensions.
 *
 * @example
 * ```tsx
 * <VoltraWidgetPreview
 *   family="systemSmall"
 *   style={{ backgroundColor: 'lightgray' }}
 * >
 *   <Voltra.Text>Hello Widget!</Voltra.Text>
 * </VoltraWidgetPreview>
 * ```
 */
export function VoltraWidgetPreview({ family, style, children, ...voltraViewProps }: VoltraWidgetPreviewProps) {
  const dimensions = WIDGET_DIMENSIONS[family]
  const previewStyle: StyleProp<ViewStyle> = [
    {
      width: dimensions.width,
      height: dimensions.height,
    },
    style,
  ]

  return (
    <VoltraView {...voltraViewProps} style={previewStyle}>
      {children}
    </VoltraView>
  )
}
