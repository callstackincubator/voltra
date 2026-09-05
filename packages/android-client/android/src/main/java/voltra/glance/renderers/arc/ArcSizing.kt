package voltra.glance.renderers.arc

import androidx.compose.ui.unit.DpSize
import voltra.styling.SizeValue
import kotlin.math.roundToInt

/** Edge used when neither the style nor the widget says how large the arc should be. */
const val DEFAULT_ARC_SIZE_DP = 64f

/** Hard cap on the bitmap edge. At the cap the arc loses resolution, it never fails to render. */
const val MAX_ARC_EDGE_PX = 512

/** Lower bound of the density multiplier, so ldpi devices still get a usable bitmap. */
const val MIN_ARC_DENSITY_SCALE = 1f

/** Upper bound of the density multiplier, so xxxhdpi devices do not quadruple the byte cost. */
const val MAX_ARC_DENSITY_SCALE = 3.5f

/**
 * The pixel size of an arc bitmap together with the px-per-dp factor that produced it.
 *
 * Stroke widths must be scaled by [scale] rather than by the raw display density, so that the
 * stroke keeps its proportion to the arc once [MAX_ARC_EDGE_PX] starts to bite.
 */
data class ArcSize(
    val sizePx: Int,
    val scale: Float,
    /** The requested edge in dp, used to give an otherwise unsized arc a layout size. */
    val requestedDp: Float,
)

/**
 * Maps a requested dp size to the pixel size of the square arc bitmap.
 *
 * The requested edge is the smaller of the style width and height, the smaller widget dimension
 * where the style says fill, and [DEFAULT_ARC_SIZE_DP] when nothing is known. It is multiplied
 * by [density] clamped to `MIN_ARC_DENSITY_SCALE..MAX_ARC_DENSITY_SCALE` and capped at
 * [MAX_ARC_EDGE_PX] per edge.
 *
 * This is the single place that decides how large an arc bitmap gets.
 */
fun resolveArcSize(
    width: SizeValue?,
    height: SizeValue?,
    widgetSize: DpSize?,
    density: Float,
): ArcSize {
    val widthDp = resolveEdgeDp(width, widgetSize?.width?.value)
    val heightDp = resolveEdgeDp(height, widgetSize?.height?.value)

    val requestedDp =
        when {
            widthDp != null && heightDp != null -> minOf(widthDp, heightDp)
            else -> widthDp ?: heightDp ?: DEFAULT_ARC_SIZE_DP
        }

    val densityScale = density.coerceIn(MIN_ARC_DENSITY_SCALE, MAX_ARC_DENSITY_SCALE)
    val sizePx = (requestedDp * densityScale).roundToInt().coerceIn(1, MAX_ARC_EDGE_PX)

    return ArcSize(sizePx = sizePx, scale = sizePx / requestedDp, requestedDp = requestedDp)
}

private fun resolveEdgeDp(
    size: SizeValue?,
    widgetEdgeDp: Float?,
): Float? =
    when (size) {
        is SizeValue.Fixed -> size.value.value.takeIf { it > 0f }
        is SizeValue.Fill -> widgetEdgeDp?.takeIf { it > 0f }
        else -> null
    }
