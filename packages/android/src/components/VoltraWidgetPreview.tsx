import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

import { VoltraView, VoltraViewProps } from './VoltraView.js'

/**
 * Android-specific widget sizes in dp.
 */
export type AndroidWidgetFamily = 'small' | 'mediumSquare' | 'mediumWide' | 'mediumTall' | 'large' | 'extraLarge'

const WIDGET_DIMENSIONS: Record<AndroidWidgetFamily, { width: number; height: number }> = {
  small: { width: 150, height: 100 },
  mediumSquare: { width: 200, height: 200 },
  mediumWide: { width: 250, height: 150 },
  mediumTall: { width: 150, height: 250 },
  large: { width: 300, height: 200 },
  extraLarge: { width: 350, height: 300 },
}

export type VoltraWidgetPreviewProps = Omit<VoltraViewProps, 'style'> & {
  /**
   * Android widget size to preview
   */
  family: AndroidWidgetFamily
  /**
   * Additional styles to apply on top of the widget dimensions
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A preview component that renders Voltra Android JSX content at specific dimensions.
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
