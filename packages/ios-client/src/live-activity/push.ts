import type { Spec } from '../native/NativeVoltra.js'
import { assertRunningOnApple } from '../utils/index.js'
import { getNativeVoltra } from '../VoltraModule.js'

/**
 * A JavaScript bundle updated over the air can run on a native build without these methods. Warn
 * and fall back instead of throwing a TypeError.
 */
const nativeMethod = <
  K extends 'getLiveActivityPushTokens' | 'getLiveActivityPushToStartToken' | 'areLiveActivitiesEnabled'
>(
  name: K
): Spec[K] | null => {
  const voltraModule = getNativeVoltra()
  const method = voltraModule[name]
  if (typeof method !== 'function') {
    console.warn(`[Voltra] ${name}() needs a newer native build. Rebuild the app to use it.`)
    return null
  }
  return method.bind(voltraModule) as Spec[K]
}

export type LiveActivityPushToken = {
  /** Same value as `activityName` on `activityTokenReceived`. Covers static and dynamic activities. */
  activityName: string
  pushToken: string
}

/**
 * Tokens of running activities that already have one. Empty when push notifications are disabled.
 *
 * Subscribe to `activityTokenReceived` first, then call this: a token issued in between is then seen
 * at least once, and the same token may arrive from both, so upsert it on your backend.
 */
export async function getLiveActivityPushTokens(): Promise<LiveActivityPushToken[]> {
  if (!assertRunningOnApple()) return []
  const getTokens = nativeMethod('getLiveActivityPushTokens')
  if (!getTokens) return []
  const tokens = await getTokens()
  return tokens.map(({ activityName, pushToken }) => ({ activityName, pushToken }))
}

/**
 * iOS 17.2+. null on older iOS, when push is disabled, or before APNs issues one.
 *
 * Subscribe to `activityPushToStartTokenReceived` first, then call this, and upsert the token on your
 * backend.
 */
export async function getLiveActivityPushToStartToken(): Promise<string | null> {
  if (!assertRunningOnApple()) return null
  const getToken = nativeMethod('getLiveActivityPushToStartToken')
  if (!getToken) return null
  return (await getToken()) ?? null
}

/**
 * Whether the user allows Live Activities for this app. Synchronous, like `isLiveActivityActive`.
 * False below iOS 16.4. Listen for `activityEnablementChanged` to learn when it changes.
 */
export function areLiveActivitiesEnabled(): boolean {
  if (!assertRunningOnApple()) return false
  const areEnabled = nativeMethod('areLiveActivitiesEnabled')
  return areEnabled ? areEnabled() : false
}
