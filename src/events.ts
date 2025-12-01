import { assertRunningOnApple } from './utils'
import VoltraUIModule from './VoltraUIModule'

export type EventSubscription = {
  remove: () => void
}

export type ActivityState = 'active' | 'dismissed' | 'pending' | 'stale' | 'ended' | string
export type ActivityTokenReceivedEvent = {
  activityID: string
  activityName: string
  activityPushToken: string
}
export type ActivityPushToStartTokenReceivedEvent = {
  activityPushToStartToken: string
}
export type ActivityUpdateEvent = {
  activityID: string
  activityName: string
  activityState: ActivityState
}

export type VoltraUIEvent = {
  identifier?: string
  eventHandler?: string
  componentType: string
  // Optional payload for future extensibility
  payload?: Record<string, unknown>
}

const noopSubscription: EventSubscription = {
  remove: () => {},
}

export function addActivityTokenListener(listener: (event: ActivityTokenReceivedEvent) => void): EventSubscription {
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraUIModule.addListener('onTokenReceived', listener)
}

export function addActivityPushToStartTokenListener(
  listener: (event: ActivityPushToStartTokenReceivedEvent) => void
): EventSubscription {
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraUIModule.addListener('onPushToStartTokenReceived', listener)
}

export function addActivityUpdatesListener(listener: (event: ActivityUpdateEvent) => void): EventSubscription {
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraUIModule.addListener('onStateChange', listener)
}

export function addVoltraUIEventListener(listener: (event: VoltraUIEvent) => void): EventSubscription {
  if (!assertRunningOnApple()) {
    return noopSubscription
  }

  return VoltraUIModule.addListener('onVoltraUIEvent', listener)
}
