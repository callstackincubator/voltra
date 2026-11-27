import { Platform } from 'react-native'

import { subscribeToChannelEvents } from './event-channel.js'
import type { EventSubscription } from './types.js'
import type { VoltraWidgetPlacement, VoltraWidgetPlacementWithSize } from './widget-placement.js'

export type {
  VoltraWidgetPlacement,
  VoltraWidgetPlacementSize,
  VoltraWidgetPlacementWithSize,
} from './widget-placement.js'

export type BasicVoltraEvent = {
  source: string
  timestamp: number
}

export type VoltraActivityState = 'active' | 'dismissed' | 'pending' | 'stale' | 'ended' | string
export type VoltraActivityTokenReceivedEvent = BasicVoltraEvent & {
  type: 'activityTokenReceived'
  activityName: string
  pushToken: string
}
export type VoltraActivityPushToStartTokenReceivedEvent = BasicVoltraEvent & {
  type: 'activityPushToStartTokenReceived'
  pushToStartToken: string
}
export type VoltraActivityUpdateEvent = BasicVoltraEvent & {
  type: 'stateChange'
  activityName: string
  activityState: VoltraActivityState
}

export type VoltraInteractionEvent = BasicVoltraEvent & {
  type: 'interaction'
  identifier: string
  payload: string
}

export type VoltraWidgetAddedEvent = BasicVoltraEvent & { type: 'widgetAdded' } & VoltraWidgetPlacementWithSize
export type VoltraWidgetResizedEvent = BasicVoltraEvent & { type: 'widgetResized' } & VoltraWidgetPlacementWithSize
export type VoltraWidgetRemovedEvent = BasicVoltraEvent & { type: 'widgetRemoved' } & VoltraWidgetPlacement
export type VoltraWidgetRestoredEvent = BasicVoltraEvent & { type: 'widgetRestored' } & VoltraWidgetPlacement & {
    previousAppWidgetId: number
  }
export type VoltraWidgetEnabledEvent = BasicVoltraEvent & { type: 'widgetEnabled'; widgetType: string }
export type VoltraWidgetDisabledEvent = BasicVoltraEvent & { type: 'widgetDisabled'; widgetType: string }

const noopSubscription: EventSubscription = {
  remove: () => {},
}

export type VoltraEventMap = {
  activityTokenReceived: VoltraActivityTokenReceivedEvent
  activityPushToStartTokenReceived: VoltraActivityPushToStartTokenReceivedEvent
  stateChange: VoltraActivityUpdateEvent
  interaction: VoltraInteractionEvent
  widgetAdded: VoltraWidgetAddedEvent
  widgetResized: VoltraWidgetResizedEvent
  widgetRemoved: VoltraWidgetRemovedEvent
  widgetRestored: VoltraWidgetRestoredEvent
  widgetEnabled: VoltraWidgetEnabledEvent
  widgetDisabled: VoltraWidgetDisabledEvent
}

const lifecycleEventTypes = new Set<keyof VoltraEventMap>([
  'widgetAdded',
  'widgetResized',
  'widgetRemoved',
  'widgetRestored',
  'widgetEnabled',
  'widgetDisabled',
])

export function addVoltraListener<K extends keyof VoltraEventMap>(
  event: K,
  listener: (event: VoltraEventMap[K]) => void
): EventSubscription {
  if (lifecycleEventTypes.has(event)) {
    if (Platform.OS === 'android') {
      return subscribeToChannelEvents(event, listener)
    }
    console.warn(`[Voltra] Event '${event}' is only supported on Android. Returning no-op subscription.`)
    return noopSubscription
  }

  console.warn(`[Voltra] Event '${event}' is only supported on iOS. Returning no-op subscription.`)
  return noopSubscription
}
