import { Platform } from 'react-native'

import type { EventSubscription } from './types.js'
import VoltraModule from './VoltraModule.js'

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

/**
 * Add a listener for Voltra events.
 *
 * Supported events:
 * - `interaction`: User interactions with widgets (buttons, switches, checkboxes) (iOS only)
 * - `stateChange`: Live Activity state changes (iOS only)
 * - `activityTokenReceived`: Push token for Live Activity (iOS only)
 * - `activityPushToStartTokenReceived`: Push-to-start token (iOS only)
 *
 * Note: On Android, interactions open the app directly (optionally via deep links)
 * instead of emitting background events.
 *
 * @param event The event type to listen for
 * @param listener Callback function to handle the event
 * @returns EventSubscription with a remove() method to unsubscribe
 */
export function addVoltraListener<K extends keyof VoltraEventMap>(
  event: K,
  listener: (event: VoltraEventMap[K]) => void
): EventSubscription {
  if (Platform.OS !== 'ios') {
    console.warn(`[Voltra] Event '${event}' is only supported on iOS. Returning no-op subscription.`)
    return noopSubscription
  }

  return VoltraModule.addListener(event, listener)
}
