package voltra.ongoingnotification

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.drawable.Icon
import android.net.Uri
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import voltra.images.VoltraImageManager
import java.io.ByteArrayOutputStream
import java.io.InputStream
import kotlin.math.roundToInt

/**
 * Turns a payload [AndroidOngoingNotificationImageSource] into something a notification can carry.
 *
 * Every bitmap is downscaled to the requested long edge before it reaches the builder. The framework
 * clamps what it *renders* (416dp x 284dp for a big picture, 48dp for a right-hand icon) only at
 * enqueue time, after the app has decoded the full image and parcelled it in notify(), so a 12 MP
 * photo costs the app roughly 48 MB of ARGB_8888 and rides through the binder transaction either way.
 *
 * Drawable resources that stay in the collapsed-thumbnail path are handed over as
 * [Icon.createWithResource] and never decoded here, which keeps their pixels out of the app heap.
 * Decoding a drawable is unavoidable when the platform only accepts a bitmap for it: bitmap
 * resources go through [BitmapFactory], where they can be subsampled while decoding, and anything
 * that is not a bitmap (a vector, a layer list) is drawn to a canvas.
 */
internal class VoltraNotificationImageResolver(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraNotificationImage"

        /**
         * Long edge kept for a big picture. Comfortably above the 416dp the framework can render at
         * the densest shipping density (about 1456px at 3.5x is unreachable, 416dp at 2.5x is 1040px),
         * and small enough that one picture stays near 4 MB of ARGB_8888.
         */
        const val MAX_PICTURE_LONG_EDGE_PX = 1024

        /** Long edge kept for large and right-hand icons, which the framework renders at 48dp. */
        const val MAX_ICON_LONG_EDGE_PX = 256
    }

    private val imageManager by lazy { VoltraImageManager(context) }

    /**
     * Resolves an [Icon] for sources the framework can render directly, or null when the source is
     * absent or cannot be decoded. Failures are logged, never thrown: a broken image must not stop a
     * status update.
     */
    fun resolveIcon(
        source: AndroidOngoingNotificationImageSource?,
        maxLongEdgePx: Int,
    ): Icon? {
        if (source == null) return null

        source.assetName?.takeIf { it.isNotBlank() }?.let { assetName ->
            val resId = drawableResourceId(assetName)
            if (resId != 0) {
                return Icon.createWithResource(context, resId)
            }

            decodePreloaded(assetName, maxLongEdgePx)?.let { return Icon.createWithBitmap(it) }
        }

        decodeBase64(source.base64, maxLongEdgePx)?.let { return Icon.createWithBitmap(it) }

        return null
    }

    /**
     * Resolves a [Bitmap] for platform versions whose notification API only takes bitmaps. Every
     * source kind is decoded, including bundled drawables, which may be vector drawables.
     */
    fun resolveBitmap(
        source: AndroidOngoingNotificationImageSource?,
        maxLongEdgePx: Int,
    ): Bitmap? {
        if (source == null) return null

        source.assetName?.takeIf { it.isNotBlank() }?.let { assetName ->
            val resId = drawableResourceId(assetName)
            if (resId != 0) {
                return decodeDrawable(resId, maxLongEdgePx)
            }

            decodePreloaded(assetName, maxLongEdgePx)?.let { return it }
        }

        return decodeBase64(source.base64, maxLongEdgePx)
    }

    private fun drawableResourceId(assetName: String): Int =
        context.resources.getIdentifier(assetName, "drawable", context.packageName)

    private fun decodePreloaded(
        assetName: String,
        maxLongEdgePx: Int,
    ): Bitmap? {
        val uriString = imageManager.getUriForKey(assetName) ?: return null

        return try {
            val bytes =
                context.contentResolver.openInputStream(Uri.parse(uriString))?.use { stream ->
                    readFully(stream)
                } ?: return null

            decodeBytes(bytes, assetName, maxLongEdgePx)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to decode notification image asset: $assetName", error)
            null
        }
    }

    private fun decodeBase64(
        base64: String?,
        maxLongEdgePx: Int,
    ): Bitmap? {
        if (base64.isNullOrBlank()) return null

        return try {
            decodeBytes(Base64.decode(base64, Base64.DEFAULT), "base64 image", maxLongEdgePx)
        } catch (error: Exception) {
            Log.e(TAG, "Failed to decode notification base64 image", error)
            null
        }
    }

    /**
     * Two-pass decode: read the dimensions without allocating pixels, then decode with the largest
     * power-of-two subsampling that still leaves the long edge at or above the target, and scale the
     * remainder. This keeps the peak allocation near the target instead of near the source.
     */
    private fun decodeBytes(
        bytes: ByteArray,
        label: String,
        maxLongEdgePx: Int,
    ): Bitmap? =
        try {
            val bounds =
                BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
            BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)

            val options =
                BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, maxLongEdgePx)
                }

            BitmapFactory
                .decodeByteArray(bytes, 0, bytes.size, options)
                ?.let { scaleDown(it, maxLongEdgePx) }
        } catch (error: Exception) {
            Log.e(TAG, "Failed to decode notification image: $label", error)
            null
        }

    /**
     * A bitmap resource is sampled by the decoder itself. Inflating it into a drawable first would
     * allocate it at full resolution, which is the allocation the cap exists to avoid, and the
     * framework only trims notification artwork after that. Drawables that are not bitmaps answer
     * no bounds to the decoder, so those are drawn to a canvas instead.
     */
    private fun decodeDrawable(
        resId: Int,
        maxLongEdgePx: Int,
    ): Bitmap? = decodeBitmapResource(resId, maxLongEdgePx) ?: renderDrawable(resId, maxLongEdgePx)

    private fun decodeBitmapResource(
        resId: Int,
        maxLongEdgePx: Int,
    ): Bitmap? {
        return try {
            val bounds =
                BitmapFactory.Options().apply {
                    inJustDecodeBounds = true
                }
            BitmapFactory.decodeResource(context.resources, resId, bounds)

            // Vector, layer-list and state-list resources carry no pixel dimensions to decode by.
            if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
                return null
            }

            val options =
                BitmapFactory.Options().apply {
                    inSampleSize = computeInSampleSize(bounds.outWidth, bounds.outHeight, maxLongEdgePx)
                }

            BitmapFactory
                .decodeResource(context.resources, resId, options)
                ?.let { scaleDown(it, maxLongEdgePx) }
        } catch (error: Exception) {
            Log.e(TAG, "Failed to decode notification bitmap resource $resId", error)
            null
        }
    }

    private fun renderDrawable(
        resId: Int,
        maxLongEdgePx: Int,
    ): Bitmap? {
        return try {
            val drawable = ContextCompat.getDrawable(context, resId) ?: return null
            val width = drawable.intrinsicWidth
            val height = drawable.intrinsicHeight

            if (width <= 0 || height <= 0) {
                Log.w(TAG, "Drawable resource $resId has no intrinsic size, skipping it for the notification")
                return null
            }

            val (targetWidth, targetHeight) = targetSize(width, height, maxLongEdgePx)
            val bitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
            drawable.setBounds(0, 0, targetWidth, targetHeight)
            drawable.draw(Canvas(bitmap))
            bitmap
        } catch (error: Exception) {
            Log.e(TAG, "Failed to render notification drawable resource $resId", error)
            null
        }
    }

    private fun scaleDown(
        bitmap: Bitmap,
        maxLongEdgePx: Int,
    ): Bitmap {
        val (targetWidth, targetHeight) = targetSize(bitmap.width, bitmap.height, maxLongEdgePx)

        if (targetWidth == bitmap.width && targetHeight == bitmap.height) {
            return bitmap
        }

        return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
    }

    private fun readFully(stream: InputStream): ByteArray {
        val buffer = ByteArrayOutputStream()
        val chunk = ByteArray(DEFAULT_READ_BUFFER_SIZE)
        var read = stream.read(chunk)

        while (read != -1) {
            buffer.write(chunk, 0, read)
            read = stream.read(chunk)
        }

        return buffer.toByteArray()
    }
}

/**
 * Largest power-of-two subsampling that still leaves the long edge at or above [maxLongEdgePx], so
 * decoding never costs more than 2x the target and the final scale stays close to one.
 */
internal fun computeInSampleSize(
    width: Int,
    height: Int,
    maxLongEdgePx: Int,
): Int {
    if (width <= 0 || height <= 0 || maxLongEdgePx <= 0) return 1

    var sampleSize = 1

    while (maxOf(width, height) / (sampleSize * 2) >= maxLongEdgePx) {
        sampleSize *= 2
    }

    return sampleSize
}

/** Target dimensions that preserve the aspect ratio and cap the long edge, rounded within a pixel. */
internal fun targetSize(
    width: Int,
    height: Int,
    maxLongEdgePx: Int,
): Pair<Int, Int> {
    if (width <= 0 || height <= 0 || maxLongEdgePx <= 0) return width to height

    val longEdge = maxOf(width, height)
    if (longEdge <= maxLongEdgePx) return width to height

    val scale = maxLongEdgePx.toFloat() / longEdge

    return maxOf(1, (width * scale).roundToInt()) to maxOf(1, (height * scale).roundToInt())
}

private const val DEFAULT_READ_BUFFER_SIZE = 8 * 1024
