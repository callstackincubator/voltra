package voltra.widget

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

/**
 * Secure credential storage for widget server-driven updates.
 * Uses Jetpack DataStore with Preferences for storing auth tokens and custom headers.
 *
 * Since Android widgets are part of the main app binary, they inherently share
 * this storage; no special grouping or sharing configuration is required.
 */

private val Context.voltraCredentialsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "voltra_widget_credentials"
)

object VoltraWidgetCredentialStore {
    private const val TAG = "VoltraWidgetCredStore"

    private val KEY_TOKEN = stringPreferencesKey("auth_token")
    private val KEY_HEADER_KEYS = stringSetPreferencesKey("header_keys")
    private const val KEY_HEADERS_PREFIX = "header_"

    /**
     * Save an auth token.
     * Called from the main app after user login.
     */
    suspend fun saveToken(context: Context, token: String): Boolean {
        return try {
            context.voltraCredentialsDataStore.edit { prefs ->
                prefs[KEY_TOKEN] = token
            }
            Log.d(TAG, "Token saved")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save token: ${e.message}", e)
            false
        }
    }

    /**
     * Read the auth token.
     * Called from the WorkManager Worker during background fetch.
     */
    suspend fun readToken(context: Context): String? {
        return try {
            context.voltraCredentialsDataStore.data
                .map { prefs -> prefs[KEY_TOKEN] }
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read token: ${e.message}", e)
            null
        }
    }

    /**
     * Read the auth token synchronously (blocking).
     * Use only from contexts where a suspend function is not available.
     */
    fun readTokenBlocking(context: Context): String? {
        return runBlocking { readToken(context) }
    }

    /**
     * Save custom headers.
     */
    suspend fun saveHeaders(context: Context, headers: Map<String, String>): Boolean {
        return try {
            context.voltraCredentialsDataStore.edit { prefs ->
                // Clear existing headers
                val existingKeys = prefs[KEY_HEADER_KEYS] ?: emptySet()
                existingKeys.forEach { key ->
                    prefs.remove(stringPreferencesKey("$KEY_HEADERS_PREFIX$key"))
                }

                // Save new headers
                val headerKeys = mutableSetOf<String>()
                headers.forEach { (key, value) ->
                    prefs[stringPreferencesKey("$KEY_HEADERS_PREFIX$key")] = value
                    headerKeys.add(key)
                }
                prefs[KEY_HEADER_KEYS] = headerKeys
            }
            Log.d(TAG, "Headers saved (${headers.size} headers)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save headers: ${e.message}", e)
            false
        }
    }

    /**
     * Read custom headers.
     * Called from the WorkManager Worker during background fetch.
     */
    suspend fun readHeaders(context: Context): Map<String, String> {
        return try {
            context.voltraCredentialsDataStore.data
                .map { prefs ->
                    val headerKeys = prefs[KEY_HEADER_KEYS] ?: emptySet()
                    val headers = mutableMapOf<String, String>()
                    headerKeys.forEach { key ->
                        val value = prefs[stringPreferencesKey("$KEY_HEADERS_PREFIX$key")]
                        if (value != null) {
                            headers[key] = value
                        }
                    }
                    headers as Map<String, String>
                }
                .firstOrNull() ?: emptyMap()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read headers: ${e.message}", e)
            emptyMap()
        }
    }

    /**
     * Read custom headers synchronously (blocking).
     * Use only from contexts where a suspend function is not available.
     */
    fun readHeadersBlocking(context: Context): Map<String, String> {
        return runBlocking { readHeaders(context) }
    }

    /**
     * Delete the auth token.
     */
    suspend fun deleteToken(context: Context): Boolean {
        return try {
            context.voltraCredentialsDataStore.edit { prefs ->
                prefs.remove(KEY_TOKEN)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete token: ${e.message}", e)
            false
        }
    }

    /**
     * Clear all stored credentials.
     */
    suspend fun clearAll(context: Context): Boolean {
        return try {
            context.voltraCredentialsDataStore.edit { prefs ->
                prefs.clear()
            }
            Log.d(TAG, "All credentials cleared")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to clear credentials: ${e.message}", e)
            false
        }
    }
}
