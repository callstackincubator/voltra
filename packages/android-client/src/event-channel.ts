import { AppState, type NativeEventSubscription } from 'react-native'

import { getNativeVoltraAndroid } from './native/NativeVoltraAndroid.js'
import type { EventSubscription } from './types.js'

// Native always records events in its queue (the Android counterpart of ADR 0011's interaction
// drain) and only signals that some are available. JavaScript pulls them with the synchronous
// `popEvents`, so an event leaves the queue in the same call that hands it to JavaScript, and is
// dispatched here to the listeners of its type.

type ChannelEvent = { type: string }

type Subscriber = {
  type: string
  listener: (event: ChannelEvent) => unknown
}

const subscribers = new Set<Subscriber>()
let availabilitySubscription: EventSubscription | null = null
let appStateSubscription: NativeEventSubscription | null = null
let isPumping = false
let pumpRequested = false
let pumpScheduled = false
// Promises returned by listeners, so a background run can wait for them (ADR 0015).
const pendingHandlers = new Set<Promise<unknown>>()

const trackPending = (type: string, result: unknown) => {
  if (!result || typeof (result as Promise<unknown>).then !== 'function') return
  const pending = Promise.resolve(result).catch((error: unknown) => {
    console.error(`[Voltra] A '${type}' listener rejected:`, error)
  })
  pendingHandlers.add(pending)
  void pending.finally(() => pendingHandlers.delete(pending))
}

const dispatch = (event: ChannelEvent): boolean => {
  let delivered = false
  for (const subscriber of [...subscribers]) {
    // Checked per call: an earlier listener may have removed this one.
    if (!subscribers.has(subscriber) || subscriber.type !== event.type) continue
    delivered = true
    try {
      trackPending(event.type, subscriber.listener(event))
    } catch (error) {
      console.error(`[Voltra] A '${event.type}' listener threw:`, error)
    }
  }
  return delivered
}

/**
 * Take every queued event of a type someone listens for and dispatch it. Events of other types stay
 * queued. Events whose listeners all went away during the dispatch are put back, in order.
 */
const pump = () => {
  if (isPumping) {
    // A signal arrived or a listener was added during dispatch; pump again once this batch is done
    // so events keep their order.
    pumpRequested = true
    return
  }

  isPumping = true
  try {
    do {
      pumpRequested = false
      if (subscribers.size === 0) return

      const types = [...new Set([...subscribers].map((subscriber) => subscriber.type))]
      const voltraModule = getNativeVoltraAndroid()
      let events: ChannelEvent[]
      try {
        events = JSON.parse(voltraModule.popEvents(types)) as ChannelEvent[]
      } catch (error) {
        console.error('[Voltra] Failed to read queued events:', error)
        return
      }

      const undelivered = events.filter((event) => !dispatch(event))
      if (undelivered.length > 0) {
        try {
          voltraModule.restoreEvents(JSON.stringify(undelivered))
        } catch (error) {
          console.error('[Voltra] Failed to put back undelivered events:', error)
        }
      }
    } while (pumpRequested)
  } finally {
    isPumping = false
  }
}

/**
 * Pump on a microtask rather than inside the caller, so `addVoltraListener` returns before any
 * listener runs. Calls in the same tick share one pump.
 */
const schedulePump = () => {
  if (pumpScheduled) return
  pumpScheduled = true
  Promise.resolve().then(() => {
    pumpScheduled = false
    pump()
  })
}

const attachTriggers = () => {
  availabilitySubscription = getNativeVoltraAndroid().onEventsAvailable(schedulePump)
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') schedulePump()
  })
}

const detachTriggers = () => {
  availabilitySubscription?.remove()
  availabilitySubscription = null
  appStateSubscription?.remove()
  appStateSubscription = null
}

const noopSubscription: EventSubscription = { remove: () => {} }

export function subscribeToChannelEvents<E extends ChannelEvent>(
  type: E['type'],
  listener: (event: E) => void
): EventSubscription {
  const voltraModule = getNativeVoltraAndroid()

  // A JavaScript bundle updated over the air can run on a native build from before the channel.
  if (typeof voltraModule.popEvents !== 'function' || typeof voltraModule.restoreEvents !== 'function') {
    console.warn(`[Voltra] Event '${type}' needs a newer native build. Returning no-op subscription.`)
    return noopSubscription
  }

  const subscriber: Subscriber = { type, listener: listener as (event: ChannelEvent) => unknown }
  subscribers.add(subscriber)
  if (subscribers.size === 1) {
    attachTriggers()
  }
  schedulePump()

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

/**
 * Pull and dispatch every queued event that has a listener now, then resolve once every promise a
 * listener returned has settled, including ones started meanwhile. Used by the headless task that
 * keeps a background run alive (ADR 0015).
 */
export async function drainChannelEvents(): Promise<void> {
  pump()
  // Let a pump scheduled by a listener added during module evaluation run first.
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
  while (pendingHandlers.size > 0) {
    await Promise.allSettled([...pendingHandlers])
  }
}

/** Whether a listener is registered for an event type. */
export function hasChannelSubscriber(type: string): boolean {
  return [...subscribers].some((subscriber) => subscriber.type === type)
}
