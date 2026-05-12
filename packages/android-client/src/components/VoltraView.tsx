import { type ReactNode, useEffect, useMemo } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'

import { renderAndroidViewToJson } from '@use-voltra/android'
import VoltraRN from '../native/VoltraRNNativeComponent'

import { addVoltraListener, type VoltraInteractionEvent } from '../events.js'

const generateViewId = () => `voltra-view-android-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

const voltraViewStyle: ViewStyle = {
  flex: 1,
}

export type VoltraViewProps = {
  /**
   * Unique identifier for this view instance.
   * Used as 'source' in interaction events to identify which view triggered the event.
   * If not provided, a unique ID will be generated automatically.
   */
  id?: string
  /**
   * Voltra JSX components to render
   */
  children: ReactNode
  /**
   * Style for the view container
   */
  style?: StyleProp<ViewStyle>
  /**
   * Callback when user interacts with components in the view.
   * Events are filtered by this view's id (source).
   */
  onInteraction?: (event: VoltraInteractionEvent) => void
  /**
   * Test ID for the view
   */
  testID?: string
}

/**
 * A React Native component that renders Voltra UI using SwiftUI in the native layer.
 * This component accepts Voltra JSX components as children and renders them as SwiftUI components.
 *
 * @example
 * ```tsx
 * <VoltraView id="my-view" style={{ width: 200, height: 100 }}>
 *   <Voltra.VStack>
 *     <Voltra.Text>Hello World</Voltra.Text>
 *   </Voltra.VStack>
 * </VoltraView>
 * ```
 */
export function VoltraView({ id, testID, style, children, onInteraction }: VoltraViewProps) {
  const viewId = useMemo(() => id || generateViewId(), [id])

  const payload = useMemo(() => JSON.stringify(renderAndroidViewToJson(children)), [children])

  useEffect(() => {
    if (!onInteraction) return

    const subscription = addVoltraListener('interaction', (event) => {
      if (event.source === viewId) {
        onInteraction({
          type: 'interaction',
          source: event.source,
          timestamp: event.timestamp,
          identifier: event.identifier,
          payload: event.payload,
        })
      }
    })

    return () => subscription.remove()
  }, [viewId, onInteraction])

  return (
    <View testID={testID} style={style}>
      <VoltraRN payload={payload} viewId={viewId} style={voltraViewStyle} />
    </View>
  )
}
