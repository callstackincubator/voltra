package voltra.images

import android.content.Context
import android.net.Uri
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

class VoltraImageManager(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraImageManager"
        private const val PREFS_NAME = "voltra_preload_images"
        private const val CACHE_DIR_NAME = "voltra_widget_images"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    suspend fun preloadImage(
        url: String,
        key: String,
        method: String = "GET",
        headers: Map<String, String>? = null,
    ): String? =
        withContext(Dispatchers.IO) {
            try {
                val connection = URL(url).openConnection() as HttpURLConnection
                connection.requestMethod = method
                headers?.forEach { (k, v) -> connection.setRequestProperty(k, v) }

                connection.connect()
                if (connection.responseCode !in 200..299) {
                    Log.e(TAG, "Failed to download image: ${connection.responseCode}")
                    return@withContext null
                }

                val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
                if (!cacheDir.exists()) {
                    cacheDir.mkdirs()
                }

                // Append timestamp to force refresh
                val filename = "${key}_${System.currentTimeMillis()}.png"
                val file = File(cacheDir, filename)

                connection.inputStream.use { input ->
                    file.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }

                val uri =
                    FileProvider
                        .getUriForFile(
                            context,
                            "${context.packageName}.voltra.fileprovider",
                            file,
                        ).toString()

                // Delete old file if exists
                getUriForKey(key)?.let { oldUriString ->
                    try {
                        val oldUri = Uri.parse(oldUriString)
                        context.contentResolver.delete(oldUri, null, null)
                        // Also try to delete the file directly just in case
                        val oldFilename = oldUri.lastPathSegment
                        if (oldFilename != null) {
                            File(cacheDir, oldFilename).delete()
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to delete old image file: $oldUriString", e)
                    }
                }

                prefs.edit().putString(key, uri).apply()
                return@withContext key
            } catch (e: Exception) {
                Log.e(TAG, "Error preloading image: $key", e)
                return@withContext null
            }
        }

    fun getUriForKey(key: String): String? = prefs.getString(key, null)

    fun clearPreloadedImages(keys: List<String>?) {
        val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
        if (keys == null) {
            // Clear all
            prefs.all.keys.forEach { key ->
                deleteFileForKey(key, cacheDir)
            }
            prefs.edit().clear().apply()
        } else {
            // Clear specific keys
            keys.forEach { key ->
                deleteFileForKey(key, cacheDir)
                prefs.edit().remove(key).apply()
            }
        }
    }

    private fun deleteFileForKey(
        key: String,
        cacheDir: File,
    ) {
        getUriForKey(key)?.let { uriString ->
            try {
                val uri = Uri.parse(uriString)
                val filename = uri.lastPathSegment
                if (filename != null) {
                    File(cacheDir, filename).delete()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to delete file for key: $key", e)
            }
        }
    }
}
