import type { WidgetServerCredentials } from '../types.js'
import VoltraModule from '../VoltraModule.js'

export type { WidgetServerCredentials } from '../types.js'

export async function setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void> {
  if (!credentials.token) {
    throw new Error('[Voltra][iOS] setWidgetServerCredentials: token is required')
  }

  return VoltraModule.setWidgetServerCredentials(credentials)
}

export async function clearWidgetServerCredentials(): Promise<void> {
  return VoltraModule.clearWidgetServerCredentials()
}
