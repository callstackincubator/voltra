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
/** The user allowed or disallowed Live Activities for the app. Read the current value with `areLiveActivitiesEnabled()`. */
export type VoltraActivityEnablementChangedEvent = BasicVoltraEvent & {
  type: 'activityEnablementChanged'
  enabled: boolean
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

export type VoltraDynamicLiveActivityRenderFailedEvent = BasicVoltraEvent & {
  type: 'dynamicLiveActivityRenderFailed'
  activityName: string
  definitionId: string
  message: string
}

const noopSubscription: EventSubscription = {
  remove: () => {},
}

// Codegen EventEmitter subscriptions do not tell native code when their last
// JavaScript listener goes away. Keep these counts at the public API boundary so
// the App Group queues are drained only while they can actually be delivered.
type CountedEvent = 'interaction' | 'dynamicLiveActivityRenderFailed'
const listenerCounts: Record<CountedEvent, number> = {
  interaction: 0,
  dynamicLiveActivityRenderFailed: 0,
}

// The emitter subscription is attached before native is told to drain, so the
// drained events reach this listener.
const countListener = (
  event: CountedEvent,
  subscription: EventSubscription,
  setActive: (active: boolean) => void
): EventSubscription => {
  listenerCounts[event] += 1
  if (listenerCounts[event] === 1) {
    setActive(true)
  }

  let removed = false
  return {
    remove: () => {
      if (removed) return
      removed = true
      subscription.remove()
      listenerCounts[event] -= 1
      if (listenerCounts[event] === 0) {
        setActive(false)
      }
    },
  }
}

export type VoltraEventMap = {
  activityTokenReceived: VoltraActivityTokenReceivedEvent
  activityPushToStartTokenReceived: VoltraActivityPushToStartTokenReceivedEvent
  activityEnablementChanged: VoltraActivityEnablementChangedEvent
  stateChange: VoltraActivityUpdateEvent
  interaction: VoltraInteractionEvent
  dynamicLiveActivityRenderFailed: VoltraDynamicLiveActivityRenderFailedEvent
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
    case 'activityEnablementChanged':
      return voltraModule.onActivityEnablementChanged(listener as (arg: VoltraActivityEnablementChangedEvent) => void)
    case 'stateChange':
      return voltraModule.onStateChanged(listener as (arg: VoltraActivityUpdateEvent) => void)
    case 'interaction':
      return countListener(
        'interaction',
        voltraModule.onInteraction(listener as (arg: VoltraInteractionEvent) => void),
        (active) => voltraModule.setInteractionListenerActive(active)
      )
    case 'dynamicLiveActivityRenderFailed':
      return countListener(
        'dynamicLiveActivityRenderFailed',
        voltraModule.onDynamicLiveActivityRenderFailed(
          listener as (arg: VoltraDynamicLiveActivityRenderFailedEvent) => void
        ),
        (active) => voltraModule.setDynamicLiveActivityRenderFailureListenerActive(active)
      )
    default:
      console.warn(`[Voltra] Event '${event}' is not supported. Returning no-op subscription.`)
      return noopSubscription
  }
}
