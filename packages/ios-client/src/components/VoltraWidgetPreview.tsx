import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'

import type { WidgetFamily } from '@use-voltra/ios'

import { VoltraView, type VoltraViewProps } from './VoltraView.js'

const WIDGET_DIMENSIONS: Record<WidgetFamily, { width: number; height: number }> = {
  systemSmall: { width: 170, height: 170 },
  systemMedium: { width: 364, height: 170 },
  systemLarge: { width: 364, height: 382 },
  systemExtraLarge: { width: 364, height: 768 },
  accessoryCircular: { width: 76, height: 76 },
  accessoryRectangular: { width: 172, height: 76 },
  accessoryInline: { width: 172, height: 40 },
}

export type VoltraWidgetPreviewProps = Omit<VoltraViewProps, 'style'> & {
  family: WidgetFamily
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
