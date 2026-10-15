import { assertRunningOnApple } from '../utils/index.js'
import { getNativeVoltra } from '../VoltraModule.js'

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
  const tokens = await getNativeVoltra().getLiveActivityPushTokens()
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
  return (await getNativeVoltra().getLiveActivityPushToStartToken()) ?? null
}

/**
 * Whether the user allows Live Activities for this app. Synchronous, like `isLiveActivityActive`.
 * False below iOS 16.4. Listen for `activityEnablementChanged` to learn when it changes.
 */
export function areLiveActivitiesEnabled(): boolean {
  if (!assertRunningOnApple()) return false
  return getNativeVoltra().areLiveActivitiesEnabled()
}
