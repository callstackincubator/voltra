import type { WidgetServerCredentials } from '../types.js'
import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'

export type { WidgetServerCredentials } from '../types.js'

/**
 * @deprecated Use {@link setWidgetServerUpdate} with an `Authorization` header. This writes the
 * same stored credentials and keeps the same replace-everything semantics, so migrating is a
 * one-line change; it will be removed in a future major.
 */
export async function setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void> {
  if (!credentials.token) {
    throw new Error('[Voltra] [Android] setWidgetServerCredentials: token is required')
  }
  return getNativeVoltraAndroid().setWidgetServerCredentials(credentials)
}

/**
 * @deprecated Use {@link clearWidgetServerUpdate} instead.
 */
export async function clearWidgetServerCredentials(): Promise<void> {
  return getNativeVoltraAndroid().clearWidgetServerCredentials()
}
