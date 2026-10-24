import { Platform } from 'react-native'

import {
  parseAndroidOngoingNotificationPush,
  type AndroidOngoingNotificationPushParseFailure,
  type AndroidOngoingNotificationStopResult,
  type AndroidOngoingNotificationUpsertResult,
  type StartAndroidOngoingNotificationOptions,
  type UpsertAndroidOngoingNotificationOptions,
} from '@use-voltra/android'

import { stopAndroidOngoingNotification, upsertAndroidOngoingNotification } from './api.js'

export type HandleAndroidOngoingNotificationPushOptions = {
  /** Merged under the envelope's options; the envelope wins per key. Use it for `channelId` or `smallIcon` defaults. */
  defaults?: Partial<StartAndroidOngoingNotificationOptions>
  /** Called with the resolved `channelId` before an upsert, so the app can create the channel. */
  ensureChannel?: (channelId: string) => Promise<void> | void
}

type NativeErrorResult = { ok: false; reason: 'native_error'; message: string }

export type AndroidOngoingNotificationPushResult =
  | {
      handled: false
      reason: AndroidOngoingNotificationPushParseFailure | 'unsupported_platform'
      issues?: string[]
    }
  | { handled: true; operation: 'upsert'; notificationId: string; result: AndroidOngoingNotificationUpsertResult }
  | { handled: true; operation: 'stop'; notificationId: string; result: AndroidOngoingNotificationStopResult }
  | { handled: true; operation: 'upsert' | 'stop'; notificationId: string; result: NativeErrorResult }

const toNativeError = (error: unknown): NativeErrorResult => ({
  ok: false,
  reason: 'native_error',
  message: error instanceof Error ? error.message : String(error),
})

/**
 * The whole body of a background push task: reads the Voltra envelope from `data` and applies it.
 * Never throws, so a malformed push cannot crash the task.
 */
export const handleAndroidOngoingNotificationPush = async (
  data: unknown,
  options: HandleAndroidOngoingNotificationPushOptions = {}
): Promise<AndroidOngoingNotificationPushResult> => {
  if (Platform.OS !== 'android') {
    return { handled: false, reason: 'unsupported_platform' }
  }

  const parsed = parseAndroidOngoingNotificationPush(data)
  if (!parsed.ok) {
    return { handled: false, reason: parsed.reason, issues: parsed.issues }
  }

  const { notificationId, operation, revision } = parsed.envelope

  if (operation === 'stop') {
    try {
      const result = await stopAndroidOngoingNotification(
        notificationId,
        revision === undefined ? undefined : { revision }
      )
      return { handled: true, operation, notificationId, result }
    } catch (error) {
      return { handled: true, operation, notificationId, result: toNativeError(error) }
    }
  }

  const upsertOptions = {
    ...options.defaults,
    ...parsed.envelope.options,
    notificationId,
    ...(revision === undefined ? {} : { revision }),
  } as UpsertAndroidOngoingNotificationOptions

  try {
    if (options.ensureChannel && upsertOptions.channelId) {
      await options.ensureChannel(upsertOptions.channelId)
    }
    const result = await upsertAndroidOngoingNotification(parsed.envelope.payload!, upsertOptions)
    return { handled: true, operation, notificationId, result }
  } catch (error) {
    return { handled: true, operation, notificationId, result: toNativeError(error) }
  }
}
