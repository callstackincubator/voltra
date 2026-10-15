import React, { type ReactNode, useEffect, useMemo } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'

import { renderVoltraVariantToJson } from '@use-voltra/ios'

import VoltraFabricView from '../native/VoltraRNNativeComponent'

import { type VoltraInteractionEvent } from '../events.js'
import { subscribeToInteractions } from '../interactions.js'

const generateViewId = () => `voltra-view-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

const voltraViewStyle: ViewStyle = {
  flex: 1,
}

export type VoltraViewProps = {
  id?: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onInteraction?: (event: VoltraInteractionEvent) => void
  testID?: string
}

export function VoltraView({ id, children, style, onInteraction, testID }: VoltraViewProps) {
  const viewId = useMemo(() => id || generateViewId(), [id])

  const json = renderVoltraVariantToJson(children)
  const payload = JSON.stringify(json)

  useEffect(() => {
    if (!onInteraction) return

    // Filtered by source, so a mounted VoltraView never takes taps meant for a Live Activity or
    // widget out of the queue.
    const subscription = subscribeToInteractions((event) => {
      onInteraction({
        type: 'interaction',
        id: event.id,
        source: event.source,
        timestamp: event.timestamp,
        identifier: event.identifier,
        payload: event.payload,
      })
    }, viewId)

    return () => subscription.remove()
  }, [viewId, onInteraction])

  return <VoltraFabricView payload={payload} style={[voltraViewStyle, style]} testID={testID} viewId={viewId} />
}
