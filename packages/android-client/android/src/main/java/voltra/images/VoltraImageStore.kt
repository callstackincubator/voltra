package voltra.images

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File

internal class VoltraImageStore(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraImageStore"
        private const val PREFS_NAME = "voltra_preload_images"
        private const val CACHE_DIR_NAME = "voltra_widget_images"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getUriForKey(key: String): String? = prefs.getString(key, null)

    fun saveImageData(
        key: String,
        data: ByteArray,
    ): String {
        val cacheDir = ensureCacheDir()
        val filename = "${key}_${System.currentTimeMillis()}.png"
        val file = File(cacheDir, filename)
        file.writeBytes(data)

        val uri =
            FileProvider
                .getUriForFile(
                    context,
                    "${context.packageName}.voltra.fileprovider",
                    file,
                ).toString()

        deleteFileForKey(key)
        prefs.edit().putString(key, uri).apply()

        return uri
    }

    fun clearPreloadedImages(keys: List<String>?) {
        if (keys == null) {
            prefs.all.keys.forEach { key ->
                deleteFileForKey(key)
            }
            prefs.edit().clear().apply()
        } else {
            keys.forEach { key ->
                deleteFileForKey(key)
                prefs.edit().remove(key).apply()
            }
        }
    }

    private fun ensureCacheDir(): File {
        val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }
        return cacheDir
    }

    private fun deleteFileForKey(key: String) {
        val uriString = getUriForKey(key) ?: return

        try {
            val uri = Uri.parse(uriString)
            context.contentResolver.delete(uri, null, null)

            uri.lastPathSegment?.let { filename ->
                File(ensureCacheDir(), filename).delete()
            }
        } catch (error: Exception) {
            Log.w(TAG, "Failed to delete image file for key: $key", error)
        }
    }
}
