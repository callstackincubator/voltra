package voltra.glance.renderers.arc

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient
import kotlin.math.abs

/**
 * Draws [spec] into a fresh square ARGB_8888 bitmap using only `android.graphics`.
 *
 * The oval is inset by half the stroke so that a round cap stays inside the bitmap instead of
 * being clipped at the edge. The track is drawn first, then the filled arc on top; nothing is
 * drawn for the filled arc at zero progress.
 *
 * This function knows nothing about Glance or the Voltra element model. Prefer
 * [ArcBitmapCache.get] over calling it directly so identical specs share one bitmap.
 */
fun renderArcBitmap(spec: ArcSpec): Bitmap {
    val size = spec.sizePx.coerceAtLeast(1)
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)

    // A stroke wider than the radius would collapse the inset oval and draw nothing, so cap it
    // rather than silently rendering an empty bitmap.
    val stroke = spec.strokePx.coerceAtMost(size / 2f)
    if (stroke <= 0f) {
        return bitmap
    }

    val inset = stroke / 2f
    val oval = RectF(inset, inset, size - inset, size - inset)
    if (oval.width() <= 0f || oval.height() <= 0f) {
        return bitmap
    }

    val paint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = stroke
            strokeCap = spec.cap
        }

    if (Color.alpha(spec.trackColorArgb) != 0) {
        paint.shader = null
        paint.color = spec.trackColorArgb
        canvas.drawArc(oval, spec.startAngle, spec.sweepAngle, false, paint)
    }

    val progress = spec.progress.coerceIn(0f, 1f)
    if (progress <= 0f) {
        return bitmap
    }

    val filledSweep = spec.sweepAngle * progress
    if (filledSweep == 0f) {
        return bitmap
    }

    val gradientColors = spec.gradientColorsArgb
    if (gradientColors.size >= 2) {
        // A shader replaces the paint color, but the paint's alpha still modulates it, so keep
        // the paint fully opaque.
        paint.color = Color.WHITE
        paint.shader = sweepGradient(gradientColors, size / 2f, spec.startAngle, spec.sweepAngle)
    } else {
        paint.shader = null
        paint.color = gradientColors.firstOrNull() ?: spec.colorArgb
    }

    canvas.drawArc(oval, spec.startAngle, filledSweep, false, paint)

    return bitmap
}

/**
 * Builds the sweep gradient for the filled arc.
 *
 * A `SweepGradient` spreads its colors over the full circle, so the stops are compressed into
 * the track's own angular extent and the shader is rotated to [startAngle]. Without that, the
 * last color of a 270 degree gauge would sit past the end of the arc and never be drawn.
 *
 * A negative sweep runs counter-clockwise, so the colors are reversed and the rotation moved to
 * the far end, keeping the first color at [startAngle] either way.
 */
private fun sweepGradient(
    colors: List<Int>,
    center: Float,
    startAngle: Float,
    sweepAngle: Float,
): SweepGradient {
    val extentDegrees = abs(sweepAngle).coerceIn(1f, 360f)
    val extent = extentDegrees / 360f
    val clockwise = sweepAngle >= 0f

    val ordered = if (clockwise) colors else colors.asReversed()
    val positions = FloatArray(ordered.size) { index -> extent * index / (ordered.size - 1) }
    val rotation = if (clockwise) startAngle else startAngle - extentDegrees

    return SweepGradient(center, center, ordered.toIntArray(), positions).apply {
        setLocalMatrix(Matrix().apply { setRotate(rotation, center, center) })
    }
}
