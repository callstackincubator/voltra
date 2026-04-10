import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'

import { VoltraView, type VoltraViewProps } from './VoltraView.js'

const LOCK_SCREEN_DIMENSIONS = {
  width: 364,
  height: 160,
}

export type VoltraLiveActivityPreviewProps = Omit<VoltraViewProps, 'style'> & {
  style?: StyleProp<ViewStyle>
}

export function VoltraLiveActivityPreview({ style, children, ...voltraViewProps }: VoltraLiveActivityPreviewProps) {
  const previewStyle: StyleProp<ViewStyle> = [
    {
      width: LOCK_SCREEN_DIMENSIONS.width,
      height: LOCK_SCREEN_DIMENSIONS.height,
    },
    style,
  ]

  return (
    <VoltraView {...voltraViewProps} style={previewStyle}>
      {children}
    </VoltraView>
  )
}
