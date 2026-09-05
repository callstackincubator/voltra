package voltra.glance.renderers.arc

import android.graphics.Paint

/**
 * Fully describes one arc rendering.
 *
 * Every value is already resolved: sizes are pixels, colors are ARGB ints, and angles are
 * degrees. The spec is the only input to [renderArcBitmap] and doubles as the key of
 * [ArcBitmapCache], so it must stay immutable and must not reference anything that varies
 * between compositions of the same visual result.
 */
data class ArcSpec(
    /** Edge length of the square bitmap, in pixels. */
    val sizePx: Int,
    /** Fill fraction of the track, already clamped to `0..1`. */
    val progress: Float,
    /** Angle where the arc begins, in degrees; `0` is 3 o'clock and positive is clockwise. */
    val startAngle: Float,
    /** Total angular length of the track, in degrees. */
    val sweepAngle: Float,
    /** Stroke width of both arcs, in pixels. */
    val strokePx: Float,
    /** End shape of both arcs. */
    val cap: Paint.Cap,
    /** ARGB color of the filled arc, used when [gradientColorsArgb] has fewer than two entries. */
    val colorArgb: Int,
    /** ARGB color of the unfilled arc. A fully transparent value hides the track. */
    val trackColorArgb: Int,
    /** Sweep gradient colors of the filled arc. Two or more entries override [colorArgb]. */
    val gradientColorsArgb: List<Int> = emptyList(),
)
