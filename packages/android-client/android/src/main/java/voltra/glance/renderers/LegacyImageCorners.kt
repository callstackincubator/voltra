package voltra.glance.renderers

import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import androidx.glance.layout.ContentScale
import voltra.modifiers.NativeModifierSize
import voltra.styling.CompositeStyle
import voltra.styling.EdgeInsets
import voltra.styling.SizeValue

/**
 * Rounds an Image's corners on Android 11 and older, where Glance's `cornerRadius` (backed by
 * `RemoteViews.setViewOutlinePreferredRadius`, API 31) is unavailable.
 *
 * On Android 12+ the radius clips the image view. To match that, the view's rounded rectangle is
 * mapped into bitmap pixels the same way the ImageView scales the bitmap for its [ContentScale], and
 * the bitmap is masked with it. A `fit` image letterboxed inside its view therefore keeps square
 * corners, as it does on Android 12+.
 */
internal object LegacyImageCorners {
    /** The image view's size and corner radius, in dp. */
    data class Spec(
        val width: Float,
        val height: Float,
        val radius: Float,
    )

    /** The view's rounded rectangle in bitmap pixels, with its corner radii. */
    data class Mask(
        val rect: RectF,
        val radiusX: Float,
        val radiusY: Float,
    )

    /**
     * The spec when the image view's size is known up front: a fixed width and height, no weight and
     * no padding. Otherwise null, and the radius stays unsupported below API 31.
     */
    fun spec(
        style: CompositeStyle?,
        nativeSize: NativeModifierSize,
        hasNativePadding: Boolean,
    ): Spec? {
        val radius = style?.decoration?.cornerRadius?.value ?: return null
        if (radius <= 0f) return null
        val layout = style.layout
        if (layout.weight != null || hasNativePadding) return null
        // Padding insets the bitmap inside the clipped view; not worth mapping for a rounded image.
        if (layout.padding != null && layout.padding != EdgeInsets()) return null
        val width = (nativeSize.width ?: layout.width) as? SizeValue.Fixed ?: return null
        val height = (nativeSize.height ?: layout.height) as? SizeValue.Fixed ?: return null
        if (width.value.value <= 0f || height.value.value <= 0f) return null
        return Spec(width.value.value, height.value.value, radius)
    }

    fun computeMask(
        bitmapWidth: Int,
        bitmapHeight: Int,
        spec: Spec,
        contentScale: ContentScale,
    ): Mask? {
        if (bitmapWidth <= 0 || bitmapHeight <= 0) return null
        val viewWidth = spec.width
        val viewHeight = spec.height
        val bw = bitmapWidth.toFloat()
        val bh = bitmapHeight.toFloat()

        // View units per bitmap pixel on each axis, matching the ImageView scale types Glance uses:
        // fitXY for FillBounds, centerCrop for Crop and fitCenter for Fit.
        val scaleX: Float
        val scaleY: Float
        when (contentScale) {
            ContentScale.FillBounds -> {
                scaleX = viewWidth / bw
                scaleY = viewHeight / bh
            }

            ContentScale.Crop -> {
                val scale = maxOf(viewWidth / bw, viewHeight / bh)
                scaleX = scale
                scaleY = scale
            }

            else -> {
                val scale = minOf(viewWidth / bw, viewHeight / bh)
                scaleX = scale
                scaleY = scale
            }
        }
        // The scaled bitmap is centred in the view; the offset is negative where it overflows.
        val offsetX = (viewWidth - bw * scaleX) / 2f
        val offsetY = (viewHeight - bh * scaleY) / 2f
        val radius = minOf(spec.radius, viewWidth / 2f, viewHeight / 2f)

        return Mask(
            rect =
                RectF(
                    -offsetX / scaleX,
                    -offsetY / scaleY,
                    (viewWidth - offsetX) / scaleX,
                    (viewHeight - offsetY) / scaleY,
                ),
            radiusX = radius / scaleX,
            radiusY = radius / scaleY,
        )
    }

    /** A copy of [source] with everything outside the view's rounded rectangle made transparent. */
    fun round(
        source: Bitmap,
        spec: Spec,
        contentScale: ContentScale,
    ): Bitmap {
        val mask = computeMask(source.width, source.height, spec, contentScale) ?: return source
        val output = Bitmap.createBitmap(source.width, source.height, Bitmap.Config.ARGB_8888)
        val paint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                shader = BitmapShader(source, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP)
            }
        Canvas(output).drawRoundRect(mask.rect, mask.radiusX, mask.radiusY, paint)
        return output
    }
}
