import { requireNativeView } from 'expo'
import React, { ReactNode, useEffect, useMemo } from 'react'
import { StyleProp, ViewStyle } from 'react-native'

import { addVoltraListener, VoltraInteractionEvent } from '../../events.js'
import { androidComponentRegistry, createVoltraRenderer } from '../../renderer/renderer.js'

const NativeVoltraView = requireNativeView('VoltraModule')

// Generate a unique ID for views that don't have one
const generateViewId = () => `voltra-view-android-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

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
}

/**
 * A React Native component that renders Voltra UI for Android using Jetpack Compose.
 */
export function VoltraView({ id, children, style, onInteraction }: VoltraViewProps) {
  // Generate a stable ID if not provided
  const viewId = useMemo(() => id || generateViewId(), [id])

  const payload = useMemo(() => {
    const renderer = createVoltraRenderer(androidComponentRegistry)
    renderer.addRootNode('content', children)
    const rendered = renderer.render()

    // Move 'content' into 'variants' to match VoltraPayload structure
    const node = rendered.content
    delete rendered.content
    rendered.variants = { content: node }

    return JSON.stringify(rendered)
  }, [children])

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

  return <NativeVoltraView payload={payload} viewId={viewId} style={style} />
}
