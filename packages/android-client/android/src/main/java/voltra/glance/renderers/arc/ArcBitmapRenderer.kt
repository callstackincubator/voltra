package voltra.glance.renderers.arc

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.SweepGradient

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

    val stroke = spec.strokePx
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
        val center = size / 2f
        // A shader replaces the paint color, but the paint's alpha still modulates it, so keep
        // the paint fully opaque.
        paint.color = Color.WHITE
        paint.shader =
            SweepGradient(center, center, gradientColors.toIntArray(), null).apply {
                setLocalMatrix(Matrix().apply { setRotate(spec.startAngle, center, center) })
            }
    } else {
        paint.shader = null
        paint.color = gradientColors.firstOrNull() ?: spec.colorArgb
    }

    canvas.drawArc(oval, spec.startAngle, filledSweep, false, paint)

    return bitmap
}
