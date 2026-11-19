import { AppRegistry, Platform } from 'react-native'

import { drainChannelEvents, hasChannelSubscriber } from './event-channel.js'

/** Name of the headless task native starts when a notification action is pressed in the background. */
export const VOLTRA_HEADLESS_TASK_NAME = 'VoltraEvents'

/**
 * The headless task `VoltraHeadlessEventService` starts for a notification action press while the
 * app is not in the foreground (ADR 0015). Loading the bundle already registered the app's
 * module-scope listeners; the task pulls the queued events and keeps the process alive until the
 * listeners' work is done.
 */
export const runVoltraHeadlessTask = async (): Promise<void> => {
  if (!hasChannelSubscriber('interaction')) {
    console.warn(
      "[Voltra] A notification action ran the app in the background, but no 'interaction' listener is registered at module scope. The event stays queued until one is."
    )
  }
  await drainChannelEvents()
}

let headlessTaskRegistered = false

/** Registers {@link runVoltraHeadlessTask} with React Native. Called once by the package entry point. */
export function registerVoltraHeadlessTask(): void {
  if (Platform.OS !== 'android' || headlessTaskRegistered) return
  headlessTaskRegistered = true
  AppRegistry.registerHeadlessTask(VOLTRA_HEADLESS_TASK_NAME, () => runVoltraHeadlessTask)
}
