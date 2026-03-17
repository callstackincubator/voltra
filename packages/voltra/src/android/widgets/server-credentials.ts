import type { WidgetServerCredentials } from '../../types.js'
import VoltraModule from '../../VoltraModule.js'

// Re-export types for public API
export type { WidgetServerCredentials } from '../../types.js'

/**
 * Store server credentials for Android widget server-driven updates.
 *
 * Credentials are stored in DataStore, which is
 * automatically accessible by the widget's WorkManager background worker.
 *
 * @param credentials - The server credentials to store
 */
export async function setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void> {
  if (!credentials.token) {
    throw new Error('[Voltra] [Android] setWidgetServerCredentials: token is required')
  }
  return VoltraModule.setWidgetServerCredentials(credentials)
}

/**
 * Clear stored server credentials for Android widget updates.
 * All widgets are automatically reloaded after clearing credentials so they
 * revert to their default/unauthenticated state.
 */
export async function clearWidgetServerCredentials(): Promise<void> {
  return VoltraModule.clearWidgetServerCredentials()
}
