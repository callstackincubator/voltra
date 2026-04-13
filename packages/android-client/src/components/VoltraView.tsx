import { requireNativeView } from 'expo'
import React, { type ReactNode, useEffect, useMemo } from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'

import { renderAndroidViewToJson } from '@use-voltra/android'

import { addVoltraListener, type VoltraInteractionEvent } from '../events.js'

const NativeVoltraView = requireNativeView('VoltraModule')

const generateViewId = () => `voltra-view-android-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

export type VoltraViewProps = {
  id?: string
  children: ReactNode
  style?: StyleProp<ViewStyle>
  onInteraction?: (event: VoltraInteractionEvent) => void
}

export function VoltraView({ id, children, style, onInteraction }: VoltraViewProps) {
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

  return <NativeVoltraView payload={payload} viewId={viewId} style={style} />
}
