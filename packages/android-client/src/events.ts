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

export type VoltraInteractionReply = {
  /** The `remoteInput.key` of the action. */
  key: string
  text: string
  /** `'freeForm'` when the user typed the text, `'choice'` when they picked one of the `choices`. */
  source: 'freeForm' | 'choice'
}

/** The user pressed an event action (`actionId`) on an Android ongoing notification. */
export type VoltraInteractionEvent = BasicVoltraEvent & {
  type: 'interaction'
  /** The action's `actionId`. */
  identifier: string
  /** The action's `payload`, or `''`. */
  payload: string
  /** The Android ongoing notification that owned the action. */
  notificationId: string
  /** The notification revision the pressed button belonged to; compare it to ignore a stale press. */
  revision: number
  reply?: VoltraInteractionReply
}

/** The user swiped an Android ongoing notification away, or its `timeoutMs` removed it. */
export type VoltraNotificationDismissedEvent = BasicVoltraEvent & {
  type: 'notificationDismissed'
  notificationId: string
}

/** The user tapped the body of an Android ongoing notification. */
export type VoltraNotificationTappedEvent = BasicVoltraEvent & {
  type: 'notificationTapped'
  notificationId: string
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
  notificationDismissed: VoltraNotificationDismissedEvent
  notificationTapped: VoltraNotificationTappedEvent
  widgetAdded: VoltraWidgetAddedEvent
  widgetResized: VoltraWidgetResizedEvent
  widgetRemoved: VoltraWidgetRemovedEvent
  widgetRestored: VoltraWidgetRestoredEvent
  widgetEnabled: VoltraWidgetEnabledEvent
  widgetDisabled: VoltraWidgetDisabledEvent
}

// Ongoing notification events (ADR 0015) and Dynamic Widget lifecycle events (ADR 0014), all
// delivered through the Android event channel.
const androidEventTypes = new Set<keyof VoltraEventMap>([
  'interaction',
  'notificationDismissed',
  'notificationTapped',
  'widgetAdded',
  'widgetResized',
  'widgetRemoved',
  'widgetRestored',
  'widgetEnabled',
  'widgetDisabled',
])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const hasEnvelope = (value: Record<string, unknown>): boolean =>
  typeof value.source === 'string' && typeof value.timestamp === 'number'

const isReply = (value: unknown): value is VoltraInteractionReply =>
  isRecord(value) &&
  typeof value.key === 'string' &&
  typeof value.text === 'string' &&
  (value.source === 'freeForm' || value.source === 'choice')

/** True for an `interaction` event from an Android ongoing notification action. */
export function isVoltraInteractionEvent(value: unknown): value is VoltraInteractionEvent {
  return (
    isRecord(value) &&
    value.type === 'interaction' &&
    hasEnvelope(value) &&
    typeof value.identifier === 'string' &&
    typeof value.payload === 'string' &&
    typeof value.notificationId === 'string' &&
    typeof value.revision === 'number' &&
    (value.reply === undefined || isReply(value.reply))
  )
}

export function isVoltraNotificationDismissedEvent(value: unknown): value is VoltraNotificationDismissedEvent {
  return (
    isRecord(value) &&
    value.type === 'notificationDismissed' &&
    hasEnvelope(value) &&
    typeof value.notificationId === 'string'
  )
}

export function isVoltraNotificationTappedEvent(value: unknown): value is VoltraNotificationTappedEvent {
  return (
    isRecord(value) &&
    value.type === 'notificationTapped' &&
    hasEnvelope(value) &&
    typeof value.notificationId === 'string'
  )
}

/**
 * Subscribes to a Voltra event.
 *
 * On Android, ongoing notification events (`interaction`, `notificationDismissed`,
 * `notificationTapped`) and Dynamic Widget lifecycle events come from a native queue and are
 * delivered once. A notification action pressed while the app is not running starts the app's
 * JavaScript in the background, so register these listeners at module scope (for example in
 * `index.js`). A listener may return a promise; a background run waits for it to settle.
 */
export function addVoltraListener<K extends keyof VoltraEventMap>(
  event: K,
  listener: (event: VoltraEventMap[K]) => void
): EventSubscription {
  if (androidEventTypes.has(event)) {
    if (Platform.OS === 'android') {
      return subscribeToChannelEvents(event, listener)
    }
    console.warn(`[Voltra] Event '${event}' is only supported on Android. Returning no-op subscription.`)
    return noopSubscription
  }

  console.warn(`[Voltra] Event '${event}' is only supported on iOS. Returning no-op subscription.`)
  return noopSubscription
}
