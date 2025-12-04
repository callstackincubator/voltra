import { assertRunningOnApple } from './utils'
import VoltraModule from './VoltraModule'

export type EventSubscription = {
  remove: () => void
}

export type BasicVoltraEvent = {
  source: string
  timestamp: number
}

export type VoltraActivityState = 'active' | 'dismissed' | 'pending' | 'stale' | 'ended' | string
export type VoltraActivityTokenReceivedEvent = BasicVoltraEvent & {
  type: 'activityTokenReceived'
  activityID: string
  activityName: string
  activityPushToken: string
}
export type VoltraActivityPushToStartTokenReceivedEvent = BasicVoltraEvent & {
  type: 'activityPushToStartTokenReceived'
  activityPushToStartToken: string
}
export type VoltraActivityUpdateEvent = BasicVoltraEvent & {
  type: 'stateChange'
  activityID: string
  activityName: string
  activityState: VoltraActivityState
}

export type VoltraInteractionEvent = BasicVoltraEvent & {
  type: 'interaction'
  identifier: string
  componentId: string
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
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraModule.addListener(event, listener)
}
