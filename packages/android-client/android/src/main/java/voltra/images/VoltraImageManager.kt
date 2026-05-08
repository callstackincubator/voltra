package voltra.images

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import com.caverock.androidsvg.SVG
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.math.ceil

class VoltraImageManager(
    context: Context,
) {
    companion object {
        private const val MAX_SVG_SIZE_BYTES = 256 * 1024
    }

    private val store = VoltraImageStore(context)

    suspend fun preloadUrlImage(
        key: String,
        url: String,
        method: String = "GET",
        headers: Map<String, String>? = null,
        width: Int? = null,
        height: Int? = null,
    ): String =
        withContext(Dispatchers.IO) {
            val data = downloadUrlImage(key, url, method, headers, width, height)
            store.saveImageData(key, data)
            key
        }

    suspend fun preloadSvgImage(
        key: String,
        svg: String,
        width: Int? = null,
        height: Int? = null,
    ): String =
        withContext(Dispatchers.IO) {
            val inlineSvg = svg.trim()
            require(inlineSvg.isNotEmpty()) { "Image '$key' must provide svg" }

            val data = rasterizeSvg(key, inlineSvg, width, height)
            store.saveImageData(key, data)
            key
        }

    fun getUriForKey(key: String): String? = store.getUriForKey(key)

    fun clearPreloadedImages(keys: List<String>?) = store.clearPreloadedImages(keys)

    private fun downloadUrlImage(
        key: String,
        url: String,
        method: String,
        headers: Map<String, String>?,
        width: Int?,
        height: Int?,
    ): ByteArray {
        val urlString = url.trim()
        require(urlString.isNotEmpty()) { "Image '$key' must provide url" }

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
}
