package voltra.widget

import android.content.Context
import android.util.Base64
import android.util.Log
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager

/**
 * Encryption helper using Google Tink's AEAD primitive.
 *
 * Uses AES-256-GCM backed by the Android Keystore for key management.
 * The keyset is stored encrypted in SharedPreferences and the master key
 * never leaves the hardware-backed Keystore.
 *
 * This replaces the deprecated EncryptedSharedPreferences approach with
 * the modern DataStore + Tink architecture.
 */
object VoltraCryptoManager {
    private const val TAG = "VoltraCryptoManager"
    private const val KEYSET_NAME = "voltra_widget_keyset"
    private const val PREF_FILE_NAME = "voltra_widget_keyset_prefs"
    private const val MASTER_KEY_URI = "android-keystore://voltra_widget_master_key"

    @Volatile
    private var aead: Aead? = null

    /**
     * Get or initialize the AEAD primitive.
     * Thread-safe via double-checked locking.
     */
    private fun getAead(context: Context): Aead =
        aead ?: synchronized(this) {
            aead ?: initAead(context).also { aead = it }
        }

    private fun initAead(context: Context): Aead {
        AeadConfig.register()

        val keysetHandle: KeysetHandle =
            AndroidKeysetManager
                .Builder()
                .withSharedPref(context, KEYSET_NAME, PREF_FILE_NAME)
                .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                .withMasterKeyUri(MASTER_KEY_URI)
                .build()
                .keysetHandle

        return keysetHandle.getPrimitive(Aead::class.java)
    }

    /**
     * Encrypt a plaintext string.
     * Returns a Base64-encoded ciphertext, or null on failure.
     *
     * @param context Application context
     * @param plaintext The string to encrypt
     * @param associatedData Optional associated data for AEAD authentication
     */
    fun encrypt(
        context: Context,
        plaintext: String,
        associatedData: ByteArray = ByteArray(0),
    ): String? =
        try {
            val aead = getAead(context)
            val ciphertext = aead.encrypt(plaintext.toByteArray(Charsets.UTF_8), associatedData)
            Base64.encodeToString(ciphertext, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.e(TAG, "Encryption failed: ${e.message}", e)
            null
        }

    /**
     * Decrypt a Base64-encoded ciphertext string.
     * Returns the plaintext string, or null on failure.
     *
     * @param context Application context
     * @param encryptedBase64 The Base64-encoded ciphertext to decrypt
     * @param associatedData Optional associated data for AEAD authentication (must match encryption)
     */
    fun decrypt(
        context: Context,
        encryptedBase64: String,
        associatedData: ByteArray = ByteArray(0),
    ): String? =
        try {
            val aead = getAead(context)
            val ciphertext = Base64.decode(encryptedBase64, Base64.NO_WRAP)
            val plaintext = aead.decrypt(ciphertext, associatedData)
            String(plaintext, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "Decryption failed: ${e.message}", e)
            null
        }
}
