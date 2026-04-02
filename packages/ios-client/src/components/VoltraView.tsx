import { requireNativeView } from 'expo'
import React, { type ReactNode, useEffect, useMemo } from 'react'
import { type StyleProp, View, type ViewStyle } from 'react-native'

import { renderVoltraVariantToJson } from '@use-voltra/ios'

import { addVoltraListener, type VoltraInteractionEvent } from '../events.js'

const NativeVoltraView = requireNativeView('VoltraModule')

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
      <NativeVoltraView payload={payload} viewId={viewId} style={voltraViewStyle} />
    </View>
  )
}
