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
 * Uses Jetpack DataStore with Preferences for persistence, and Google Tink AEAD
 * for encrypting sensitive values (tokens and headers) at rest.
 *
 * Since Android widgets are part of the main app binary, they inherently share
 * this storage; no special grouping or sharing configuration is required.
 */

private val Context.voltraCredentialsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "voltra_widget_credentials",
)

object VoltraWidgetCredentialStore {
    private const val TAG = "VoltraWidgetCredStore"

    private val KEY_TOKEN = stringPreferencesKey("auth_token")
    private val KEY_HEADER_KEYS = stringSetPreferencesKey("header_keys")
    private const val KEY_HEADERS_PREFIX = "header_"

    /**
     * Save an auth token (encrypted via Tink AEAD).
     * Called from the main app after user login.
     */
    suspend fun saveToken(
        context: Context,
        token: String,
    ): Boolean =
        try {
            val encrypted =
                VoltraCryptoManager.encrypt(context, token)
                    ?: throw IllegalStateException("Failed to encrypt token")
            context.voltraCredentialsDataStore.edit { prefs ->
                prefs[KEY_TOKEN] = encrypted
            }
            Log.d(TAG, "Token saved (encrypted)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save token: ${e.message}", e)
            false
        }

    /**
     * Read the auth token (decrypted via Tink AEAD).
     * Called from the WorkManager Worker during background fetch.
     */
    suspend fun readToken(context: Context): String? =
        try {
            val encrypted =
                context.voltraCredentialsDataStore.data
                    .map { prefs -> prefs[KEY_TOKEN] }
                    .firstOrNull()
            encrypted?.let { VoltraCryptoManager.decrypt(context, it) }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read token: ${e.message}", e)
            null
        }

    /**
     * Read the auth token synchronously (blocking).
     * Use only from contexts where a suspend function is not available.
     */
    fun readTokenBlocking(context: Context): String? = runBlocking { readToken(context) }

    /**
     * Save custom headers (values encrypted via Tink AEAD).
     */
    suspend fun saveHeaders(
        context: Context,
        headers: Map<String, String>,
    ): Boolean =
        try {
            context.voltraCredentialsDataStore.edit { prefs ->
                // Clear existing headers
                val existingKeys = prefs[KEY_HEADER_KEYS] ?: emptySet()
                existingKeys.forEach { key ->
                    prefs.remove(stringPreferencesKey("$KEY_HEADERS_PREFIX$key"))
                }

                // Save new headers with encrypted values
                val headerKeys = mutableSetOf<String>()
                headers.forEach { (key, value) ->
                    val encrypted =
                        VoltraCryptoManager.encrypt(context, value)
                            ?: throw IllegalStateException("Failed to encrypt header value for key: $key")
                    prefs[stringPreferencesKey("$KEY_HEADERS_PREFIX$key")] = encrypted
                    headerKeys.add(key)
                }
                prefs[KEY_HEADER_KEYS] = headerKeys
            }
            Log.d(TAG, "Headers saved (${headers.size} headers, encrypted)")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save headers: ${e.message}", e)
            false
        }

    /**
     * Read custom headers (values decrypted via Tink AEAD).
     * Called from the WorkManager Worker during background fetch.
     */
    suspend fun readHeaders(context: Context): Map<String, String> =
        try {
            context.voltraCredentialsDataStore.data
                .map { prefs ->
                    val headerKeys = prefs[KEY_HEADER_KEYS] ?: emptySet()
                    val headers = mutableMapOf<String, String>()
                    headerKeys.forEach { key ->
                        val encrypted = prefs[stringPreferencesKey("$KEY_HEADERS_PREFIX$key")]
                        if (encrypted != null) {
                            val decrypted = VoltraCryptoManager.decrypt(context, encrypted)
                            if (decrypted != null) {
                                headers[key] = decrypted
                            } else {
                                Log.w(TAG, "Failed to decrypt header value for key: $key")
                            }
                        }
                    }
                    headers as Map<String, String>
                }.firstOrNull() ?: emptyMap()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read headers: ${e.message}", e)
            emptyMap()
        }

    /**
     * Read custom headers synchronously (blocking).
     * Use only from contexts where a suspend function is not available.
     */
    fun readHeadersBlocking(context: Context): Map<String, String> = runBlocking { readHeaders(context) }

    /**
     * Delete the auth token.
     */
    suspend fun deleteToken(context: Context): Boolean =
        try {
            context.voltraCredentialsDataStore.edit { prefs ->
                prefs.remove(KEY_TOKEN)
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to delete token: ${e.message}", e)
            false
        }

    /**
     * Clear all stored credentials.
     */
    suspend fun clearAll(context: Context): Boolean =
        try {
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
