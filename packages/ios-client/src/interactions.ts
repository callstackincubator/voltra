import { AppState, type NativeEventSubscription } from 'react-native'

import type { VoltraInteractionEvent } from './events.js'
import type { EventSubscription } from './types.js'
import { getNativeVoltra } from './VoltraModule.js'

// Taps are always recorded in the native interaction queue (ADR 0011). JavaScript pulls them with
// the synchronous `popInteractions`, so a tap leaves the queue in the same call that hands it to
// JavaScript, and is dispatched here to the listeners that want it.

type InteractionListener = (event: VoltraInteractionEvent) => void

type Subscriber = {
  listener: InteractionListener
  /** Only taps from this source. Undefined means every tap. */
  source?: string
}

const subscribers = new Set<Subscriber>()
let availabilitySubscription: EventSubscription | null = null
let appStateSubscription: NativeEventSubscription | null = null
let isPumping = false
let pumpRequested = false

const dispatch = (event: VoltraInteractionEvent) => {
  for (const subscriber of [...subscribers]) {
    // A listener removed by an earlier listener during this dispatch no longer receives taps.
    if (!subscribers.has(subscriber)) continue
    if (subscriber.source !== undefined && subscriber.source !== event.source) continue
    try {
      subscriber.listener(event)
    } catch (error) {
      console.error('[Voltra] An interaction listener threw:', error)
    }
  }
}

/**
 * Take every queued tap someone is listening for and dispatch it. Taps from sources nobody listens
 * to stay queued: with only source-filtered listeners (a `VoltraView`), only their sources are taken.
 */
const pump = () => {
  if (isPumping) {
    // A listener added or a signal received during dispatch; pump again once this batch is done so
    // taps keep their order.
    pumpRequested = true
    return
  }

  isPumping = true
  try {
    do {
      pumpRequested = false
      if (subscribers.size === 0) return

      const all = [...subscribers]
      const sources = all.some((subscriber) => subscriber.source === undefined)
        ? null
        : [...new Set(all.map((subscriber) => subscriber.source as string))]

      let events: readonly VoltraInteractionEvent[]
      try {
        events = getNativeVoltra().popInteractions(sources) as unknown as VoltraInteractionEvent[]
      } catch (error) {
        console.error('[Voltra] Failed to read queued interactions:', error)
        return
      }
      events.forEach(dispatch)
    } while (pumpRequested)
  } finally {
    isPumping = false
  }
}

const attachTriggers = () => {
  availabilitySubscription = getNativeVoltra().onInteractionsAvailable(() => pump())
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') pump()
  })
}

const detachTriggers = () => {
  availabilitySubscription?.remove()
  availabilitySubscription = null
  appStateSubscription?.remove()
  appStateSubscription = null
}

/**
 * Subscribe to taps. `source` limits the subscription to one Live Activity, widget or `VoltraView`
 * and keeps it from taking other sources' taps out of the queue.
 */
export function subscribeToInteractions(listener: InteractionListener, source?: string): EventSubscription {
  const voltraModule = getNativeVoltra()

  // A JavaScript bundle updated over the air can run on a native build from before the queue,
  // which still emits every tap directly.
  if (typeof voltraModule.popInteractions !== 'function') {
    // Those builds send no id; derive one that is the same for every listener of the same tap.
    return voltraModule.onInteraction((event) => {
      if (source === undefined || event.source === source) {
        listener({ id: `${event.timestamp}:${event.source}:${event.identifier}`, ...event } as VoltraInteractionEvent)
      }
    })
  }

  const subscriber: Subscriber = { listener, source }
  subscribers.add(subscriber)
  if (subscribers.size === 1) {
    attachTriggers()
  }
  pump()

  let removed = false
  return {
    remove: () => {
      if (removed) return
      removed = true
      subscribers.delete(subscriber)
      if (subscribers.size === 0) {
        detachTriggers()
      }
    },
  }
}
