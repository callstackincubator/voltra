import type { WidgetServerCredentials } from '../types.js'
import { getNativeVoltraAndroid } from '../native/NativeVoltraAndroid.js'

export type { WidgetServerCredentials } from '../types.js'

export async function setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void> {
  if (!credentials.token) {
    throw new Error('[Voltra] [Android] setWidgetServerCredentials: token is required')
  }
  return getNativeVoltraAndroid().setWidgetServerCredentials(credentials)
}

export async function clearWidgetServerCredentials(): Promise<void> {
  return getNativeVoltraAndroid().clearWidgetServerCredentials()
}
