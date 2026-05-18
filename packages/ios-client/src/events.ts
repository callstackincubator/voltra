import { Platform } from 'react-native'

import type { EventSubscription } from './types.js'
import { getNativeVoltra } from './VoltraModule.js'

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

const noopSubscription: EventSubscription = {
  remove: () => {},
}

export type VoltraEventMap = {
  activityTokenReceived: VoltraActivityTokenReceivedEvent
  activityPushToStartTokenReceived: VoltraActivityPushToStartTokenReceivedEvent
  stateChange: VoltraActivityUpdateEvent
  interaction: VoltraInteractionEvent
}

export function addVoltraListener<K extends keyof VoltraEventMap>(
  event: K,
  listener: (event: VoltraEventMap[K]) => void
): EventSubscription {
  if (Platform.OS !== 'ios') {
    console.warn(`[Voltra] Event '${event}' is only supported on iOS. Returning no-op subscription.`)
    return noopSubscription
  }

  const voltraModule = getNativeVoltra()

  switch (event) {
    case 'activityTokenReceived':
      return voltraModule.onActivityTokenReceived(listener as (arg: VoltraActivityTokenReceivedEvent) => void)
    case 'activityPushToStartTokenReceived':
      return voltraModule.onActivityPushToStartTokenReceived(
        listener as (arg: VoltraActivityPushToStartTokenReceivedEvent) => void
      )
    case 'stateChange':
      return voltraModule.onStateChanged(listener as (arg: VoltraActivityUpdateEvent) => void)
    case 'interaction':
      return voltraModule.onInteraction(listener as (arg: VoltraInteractionEvent) => void)
    default:
      console.warn(`[Voltra] Event '${event}' is not supported. Returning no-op subscription.`)
      return noopSubscription
  }
}
