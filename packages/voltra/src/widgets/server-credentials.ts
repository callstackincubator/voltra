import type { WidgetServerCredentials } from '../types.js'
import VoltraModule from '../VoltraModule.js'

// Re-export types for public API
export type { WidgetServerCredentials } from '../types.js'

/**
 * Store server credentials for widget server-driven updates.
 *
 * On iOS, credentials are stored in the Shared Keychain (accessible by both the
 * main app and widget extension) with `kSecAttrAccessibleAfterFirstUnlock` to allow
 * background access.
 *
 * On Android, credentials are encrypted via Google Tink (AES-256-GCM) and
 * persisted in Jetpack DataStore. The encryption key is managed by the Android
 * Keystore. The WorkManager background worker can access this storage directly
 * since widgets are part of the main app binary.
 *
 * Call this after the user logs in to enable authenticated widget updates.
 *
 * @param credentials - The server credentials to store
 *
 * @example
 * ```typescript
 * import { setWidgetServerCredentials } from 'voltra'
 *
 * // After user login
 * await setWidgetServerCredentials({
 *   token: userAccessToken,
 *   headers: {
 *     'X-App-Version': '1.0.0',
 *   }
 * })
 * ```
 */
export async function setWidgetServerCredentials(credentials: WidgetServerCredentials): Promise<void> {
  if (!credentials.token) {
    throw new Error('[Voltra][iOS] setWidgetServerCredentials: token is required')
  }

  return VoltraModule.setWidgetServerCredentials(credentials)
}

/**
 * Clear stored server credentials for widget updates.
 *
 * Call this when the user logs out to stop authenticated widget updates.
 * All widgets are automatically reloaded after clearing credentials so they
 * revert to their default/unauthenticated state.
 *
 * @example
 * ```typescript
 * import { clearWidgetServerCredentials } from 'voltra'
 *
 * // On user logout
 * await clearWidgetServerCredentials()
 * ```
 */
export async function clearWidgetServerCredentials(): Promise<void> {
  return VoltraModule.clearWidgetServerCredentials()
}
