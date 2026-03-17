import { requireNativeView } from 'expo'
import React, { ReactNode, useEffect, useMemo } from 'react'
import { StyleProp, View, ViewStyle } from 'react-native'

import { addVoltraListener, VoltraInteractionEvent } from '../events.js'
import { renderVoltraVariantToJson } from '../renderer/index.js'

const NativeVoltraView = requireNativeView('VoltraModule')

// Generate a unique ID for views that don't have one
const generateViewId = () => `voltra-view-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

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
export function VoltraView({ id, children, style, onInteraction, testID }: VoltraViewProps) {
  // Generate a stable ID if not provided
  const viewId = useMemo(() => id || generateViewId(), [id])

  const json = renderVoltraVariantToJson(children)
  const payload = JSON.stringify(json)

  // Subscribe to interaction events and filter by this view's ID
  useEffect(() => {
    if (!onInteraction) return

    const subscription = addVoltraListener('interaction', (event) => {
      // Only forward events from this view
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
      <NativeVoltraView payload={payload} viewId={viewId} style={voltraViewStyle} />
    </View>
  )
}
