package voltra.glance.renderers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.util.LruCache
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import voltra.styling.LayoutStyle
import voltra.styling.SizeValue
import kotlin.math.roundToInt

// Glance has no border modifier, and RemoteViews cannot draw a stroke whose width, radius and
// color are only known at runtime. The element's background and border are therefore drawn into
// one bitmap that Glance stretches over the element with ContentScale.FillBounds.
//
// Stretching is only harmless when the bitmap already has the element's size: otherwise the
// border gets thicker on one axis than the other and round corners turn into ellipses. Glance
// never reports a child's measured size, so the border is drawn only when the style fixes both
// width and height.

private val borderBitmapCache =
    object : LruCache<String, Bitmap>(2 * 1024 * 1024) {
        override fun sizeOf(
            key: String,
            value: Bitmap,
        ): Int = value.allocationByteCount
    }

/** The size a border bitmap is drawn at, or null when the style does not fix both dimensions. */
internal fun resolveBorderSize(layout: LayoutStyle): DpSize? {
    val width = (layout.width as? SizeValue.Fixed)?.value ?: return null
    val height = (layout.height as? SizeValue.Fixed)?.value ?: return null
    if (width.value <= 0f || height.value <= 0f) return null
    return DpSize(width, height)
}

/**
 * Draws a background and a border inside [size].
 *
 * The background is [backgroundFill] (a gradient bitmap) when given, otherwise [backgroundArgb].
 * Both are clipped to the rounded outline. The border is drawn inside the bounds, so it never
 * changes the element's size or the position of its children.
 */
fun renderBorderBitmap(
    context: Context,
    size: DpSize,
    cornerRadius: Dp?,
    borderWidth: Dp,
    borderArgb: Int,
    backgroundArgb: Int,
    backgroundFill: Bitmap? = null,
): Bitmap {
    val density =
        context.resources.displayMetrics.density
            .coerceAtLeast(1f)
    val rawWidth = (size.width.value * density).roundToInt().coerceAtLeast(1)
    val rawHeight = (size.height.value * density).roundToInt().coerceAtLeast(1)
    val (widthPx, heightPx) = capBitmapSize(rawWidth, rawHeight)
    // capBitmapSize scales both edges by the same factor; scale the stroke and radius with them.
    val scale = density * widthPx.toFloat() / rawWidth.toFloat()
    val halfShortEdge = minOf(widthPx, heightPx) / 2f
    val strokePx = (borderWidth.value * scale).coerceIn(0f, halfShortEdge)
    val radiusPx = ((cornerRadius?.value ?: 0f) * scale).coerceIn(0f, halfShortEdge)

    // A gradient fill has no stable key of its own; it is cached by the gradient renderer instead.
    val cacheKey =
        if (backgroundFill == null) {
            "$widthPx|$heightPx|$strokePx|$radiusPx|$borderArgb|$backgroundArgb"
        } else {
            null
        }
    cacheKey?.let { key -> borderBitmapCache.get(key)?.let { return it } }

    val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val bounds = RectF(0f, 0f, widthPx.toFloat(), heightPx.toFloat())

    val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    if (backgroundFill != null) {
        fillPaint.shader =
            BitmapShader(backgroundFill, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP).apply {
                setLocalMatrix(
                    Matrix().apply {
                        setScale(
                            widthPx.toFloat() / backgroundFill.width,
                            heightPx.toFloat() / backgroundFill.height,
                        )
                    },
                )
            }
        canvas.drawRoundRect(bounds, radiusPx, radiusPx, fillPaint)
    } else if (backgroundArgb ushr 24 != 0) {
        fillPaint.color = backgroundArgb
        canvas.drawRoundRect(bounds, radiusPx, radiusPx, fillPaint)
    }

    if (strokePx > 0f) {
        // A stroke is centered on its path, so inset the path by half the width to keep the
        // whole border inside the bounds, and shrink the radius by the same amount so the
        // outer edge of the border follows the element's rounded outline.
        val inset = strokePx / 2f
        val strokeBounds = RectF(inset, inset, widthPx - inset, heightPx - inset)
        val strokeRadius = (radiusPx - inset).coerceAtLeast(0f)
        val strokePaint =
            Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = strokePx
                color = borderArgb
            }
        canvas.drawRoundRect(strokeBounds, strokeRadius, strokeRadius, strokePaint)
    }

    cacheKey?.let { borderBitmapCache.put(it, bitmap) }
    return bitmap
}
