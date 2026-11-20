package voltra.glance.renderers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.util.Log
import android.util.LruCache
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.DpSize
import voltra.modifiers.NativeModifierSize
import voltra.styling.LayoutStyle
import voltra.styling.SizeValue
import kotlin.math.roundToInt

// Glance has no border modifier, and RemoteViews cannot draw a stroke whose width, radius and
// color are only known at runtime. The element's background and border are therefore drawn into
// one bitmap that Glance stretches over the element with ContentScale.FillBounds.
//
// Stretching is only harmless when the bitmap already has the element's size: otherwise the
// border gets thicker on one axis than the other and round corners turn into ellipses. Glance
// never reports a child's measured size, so the border is drawn only when the style or a native
// size modifier fixes both width and height, and no `flex` weight replaces them.

private val borderBitmapCache =
    object : LruCache<String, Bitmap>(2 * 1024 * 1024) {
        override fun sizeOf(
            key: String,
            value: Bitmap,
        ): Int = value.allocationByteCount
    }

/** A border that is drawn: its bitmap size, stroke width and non-transparent color. */
internal data class ResolvedBorder(
    val size: DpSize,
    val width: Dp,
    val argb: Int,
)

/**
 * The border to draw, or null when there is none to draw. The size comes from [nativeSize] where a
 * native size modifier sets one, because native modifiers are applied after style, and from
 * [layout] otherwise. A warning is logged when the size is the reason nothing is drawn.
 */
internal fun resolveBorder(
    width: Dp,
    argb: Int,
    layout: LayoutStyle,
    nativeSize: NativeModifierSize,
): ResolvedBorder? {
    val size = resolveBorderSize(layout, nativeSize)
    if (size == null) {
        Log.w("StyleModifier", "borderWidth is drawn only when width and height are fixed numbers")
        return null
    }
    return if ((argb ushr 24) != 0) ResolvedBorder(size, width, argb) else null
}

/**
 * The size a border bitmap is drawn at, or null when the element's size is not fixed. A `flex`
 * weight replaces the width or height at layout time, so a weighted element has no fixed size.
 */
internal fun resolveBorderSize(
    layout: LayoutStyle,
    nativeSize: NativeModifierSize = NativeModifierSize(null, null),
): DpSize? {
    if ((layout.weight ?: 0f) > 0f) return null
    val width = (nativeSize.width ?: layout.width) as? SizeValue.Fixed ?: return null
    val height = (nativeSize.height ?: layout.height) as? SizeValue.Fixed ?: return null
    if (width.value.value <= 0f || height.value.value <= 0f) return null
    return DpSize(width.value, height.value)
}

/**
 * Draws a background and a border inside [border]'s size.
 *
 * The background is [backgroundFill] (a gradient bitmap) when given, otherwise [backgroundArgb].
 * Both are clipped to the rounded outline. The border is drawn inside the bounds, so it never
 * changes the element's size or the position of its children.
 */
internal fun renderBorderBitmap(
    context: Context,
    border: ResolvedBorder,
    cornerRadius: Dp?,
    backgroundArgb: Int,
    backgroundFill: Bitmap? = null,
): Bitmap {
    val size = border.size
    val borderWidth = border.width
    val borderArgb = border.argb
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
