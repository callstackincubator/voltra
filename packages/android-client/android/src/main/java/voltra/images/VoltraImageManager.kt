package voltra.images

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.net.Uri
import android.util.Log
import androidx.core.content.FileProvider
import com.caverock.androidsvg.SVG
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.ceil

class VoltraImageManager(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraImageManager"
        private const val PREFS_NAME = "voltra_preload_images"
        private const val CACHE_DIR_NAME = "voltra_widget_images"
        private const val MAX_SVG_SIZE_BYTES = 256 * 1024
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    suspend fun preloadImage(
        key: String,
        url: String? = null,
        svg: String? = null,
        method: String = "GET",
        headers: Map<String, String>? = null,
        width: Int? = null,
        height: Int? = null,
    ): String =
        withContext(Dispatchers.IO) {
            val data = resolveImageData(key, url, svg, method, headers, width, height)
            saveImageData(key, data)
            key
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

    private fun resolveImageData(
        key: String,
        url: String?,
        svg: String?,
        method: String,
        headers: Map<String, String>?,
        width: Int?,
        height: Int?,
    ): ByteArray {
        val inlineSvg = svg?.trim()
        if (!inlineSvg.isNullOrEmpty()) {
            return rasterizeSvg(key, inlineSvg, width, height)
        }

        val urlString = url?.trim()
        require(!urlString.isNullOrEmpty()) { "Image '$key' must provide either url or svg" }

        val connection = URL(urlString).openConnection() as HttpURLConnection
        connection.requestMethod = method
        headers?.forEach { (k, v) -> connection.setRequestProperty(k, v) }

        try {
            connection.connect()
            require(connection.responseCode in 200..299) {
                "HTTP error while downloading image '$key': ${connection.responseCode}"
            }

            val data = connection.inputStream.use { input -> input.readBytes() }
            val contentType = connection.contentType

            return if (isSvgData(data, contentType, urlString)) {
                require(data.size < MAX_SVG_SIZE_BYTES) {
                    "SVG '$key' is too large: ${data.size} bytes (max $MAX_SVG_SIZE_BYTES bytes)"
                }
                val svgString = data.toString(Charsets.UTF_8)
                rasterizeSvg(key, svgString, width, height)
            } else {
                data
            }
        } finally {
            connection.disconnect()
        }
    }

    private fun saveImageData(
        key: String,
        data: ByteArray,
    ) {
        val cacheDir = File(context.cacheDir, CACHE_DIR_NAME)
        if (!cacheDir.exists()) {
            cacheDir.mkdirs()
        }

        // Append timestamp to force refresh
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
    }

    private fun isSvgData(
        data: ByteArray,
        contentType: String?,
        url: String,
    ): Boolean {
        if (contentType?.lowercase()?.contains("image/svg+xml") == true) return true
        if (url.substringBefore("?").lowercase().endsWith(".svg")) return true

        val prefix = data.copyOfRange(0, minOf(data.size, 512)).toString(Charsets.UTF_8).lowercase()
        return prefix.contains("<svg")
    }

    private fun rasterizeSvg(
        key: String,
        svgMarkup: String,
        width: Int?,
        height: Int?,
    ): ByteArray {
        val svgSize = svgMarkup.toByteArray(Charsets.UTF_8).size
        require(svgSize < MAX_SVG_SIZE_BYTES) {
            "SVG '$key' is too large: $svgSize bytes (max $MAX_SVG_SIZE_BYTES bytes)"
        }

        validateSvg(key, svgMarkup)

        val svg = SVG.getFromString(svgMarkup)
        val renderWidth = width ?: ceil(svg.documentWidth.toDouble()).toInt()
        val renderHeight = height ?: ceil(svg.documentHeight.toDouble()).toInt()

        require(renderWidth > 0 && renderHeight > 0) {
            "SVG '$key' requires positive width and height"
        }

        val picture = svg.renderToPicture(renderWidth, renderHeight)
        val bitmap = Bitmap.createBitmap(renderWidth, renderHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.TRANSPARENT)
        canvas.drawPicture(picture)

        return ByteArrayOutputStream().use { output ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
            bitmap.recycle()
            output.toByteArray()
        }
    }

    private fun validateSvg(
        key: String,
        svgMarkup: String,
    ) {
        val lower = svgMarkup.trim().lowercase()
        require(lower.contains("<svg")) { "Invalid SVG data for '$key'" }
        require(
            !lower.contains("<script") &&
                !lower.contains("javascript:") &&
                !lower.contains("<iframe") &&
                !lower.contains("<object") &&
                !lower.contains("<embed") &&
                !lower.contains("href=\"http") &&
                !lower.contains("href='http") &&
                !lower.contains("xlink:href=\"http") &&
                !lower.contains("xlink:href='http"),
        ) {
            "Invalid SVG data for '$key'"
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
