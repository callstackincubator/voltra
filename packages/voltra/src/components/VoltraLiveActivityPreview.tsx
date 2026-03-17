import React from 'react'
import { StyleProp, ViewStyle } from 'react-native'

import { VoltraView, VoltraViewProps } from './VoltraView.js'

/**
 * Dimensions for iOS lock screen Live Activity in points (approximate)
 * Based on iPhone 14 Pro/15 Pro dimensions
 */
const LOCK_SCREEN_DIMENSIONS = {
  width: 364,
  height: 160,
}

export type VoltraLiveActivityPreviewProps = Omit<VoltraViewProps, 'style'> & {
  /**
   * Additional styles to apply on top of the lock screen dimensions
   */
  style?: StyleProp<ViewStyle>
}

/**
 * A preview component that renders Voltra JSX lock screen Live Activity content
 * at the exact dimensions of a lock screen Live Activity. Useful for testing
 * Live Activity layouts.
 *
 * This component extends VoltraView but automatically sets the width and height
 * to match the lock screen Live Activity dimensions. Live Activities cannot be
 * fully emulated, so this provides a close approximation for development.
 *
 * @example
 * ```tsx
 * <VoltraLiveActivityPreview
 *   style={{ backgroundColor: 'lightgray' }}
 * >
 *   <Voltra.Text>Hello Live Activity!</Voltra.Text>
 * </VoltraLiveActivityPreview>
 * ```
 */
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
