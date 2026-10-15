import { Platform } from 'react-native'

import { subscribeToInteractions } from './interactions.js'
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
  /** Unique per tap, so two taps on the same button can be told apart. */
  id: string
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
// JavaScript listener goes away. Keep this count at the public API boundary so
// the App Group queue is drained only while it can actually be delivered.
let dynamicRenderFailureListenerCount = 0

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
      return subscribeToInteractions(listener as (arg: VoltraInteractionEvent) => void)
    case 'dynamicLiveActivityRenderFailed':
      const subscription = voltraModule.onDynamicLiveActivityRenderFailed(
        listener as (arg: VoltraDynamicLiveActivityRenderFailedEvent) => void
      )
      dynamicRenderFailureListenerCount += 1
      if (dynamicRenderFailureListenerCount === 1) {
        voltraModule.setDynamicLiveActivityRenderFailureListenerActive(true)
      }

      let removed = false
      return {
        remove: () => {
          if (removed) return
          removed = true
          subscription.remove()
          dynamicRenderFailureListenerCount -= 1
          if (dynamicRenderFailureListenerCount === 0) {
            voltraModule.setDynamicLiveActivityRenderFailureListenerActive(false)
          }
        },
      }
    default:
      console.warn(`[Voltra] Event '${event}' is not supported. Returning no-op subscription.`)
      return noopSubscription
  }
}
