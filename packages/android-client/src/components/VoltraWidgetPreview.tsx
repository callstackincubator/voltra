import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'

import { VoltraView, type VoltraViewProps } from './VoltraView.js'

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
  family: AndroidWidgetFamily
  style?: StyleProp<ViewStyle>
}

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
