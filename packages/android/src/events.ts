import type { EventSubscription } from './types.js'
import VoltraModule from './VoltraModule.js'

export type BasicVoltraEvent = {
  source: string
  timestamp: number
}

export type VoltraInteractionEvent = BasicVoltraEvent & {
  type: 'interaction'
  identifier: string
  payload: string
}

export type VoltraEventMap = {
  interaction: VoltraInteractionEvent
}

/**
 * Add a listener for Voltra events.
 *
 * Supported events:
 * - `interaction`: User interactions with widgets rendered inside a Voltra view.
 *
 * @param event The event type to listen for
 * @param listener Callback function to handle the event
 * @returns EventSubscription with a remove() method to unsubscribe
 */
export function addVoltraListener<K extends keyof VoltraEventMap>(
  event: K,
  listener: (event: VoltraEventMap[K]) => void
): EventSubscription {
  return VoltraModule.addListener(event, listener)
}
