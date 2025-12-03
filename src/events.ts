import { assertRunningOnApple } from './utils'
import VoltraModule from './VoltraModule'

export type EventSubscription = {
  remove: () => void
}

export type VoltraActivityState = 'active' | 'dismissed' | 'pending' | 'stale' | 'ended' | string
export type VoltraActivityTokenReceivedEvent = {
  activityID: string
  activityName: string
  activityPushToken: string
}
export type VoltraActivityPushToStartTokenReceivedEvent = {
  activityPushToStartToken: string
}
export type VoltraActivityUpdateEvent = {
  activityID: string
  activityName: string
  activityState: VoltraActivityState
}

export type VoltraInteractionEvent = {
  identifier?: string
  componentType: string
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
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraModule.addListener(event, listener)
}
