package voltra.widget.payload

import android.appwidget.AppWidgetManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.util.SizeF
import android.widget.RemoteViews

private const val TAG = "ResponsiveWidgetUpdate"

/**
 * Pushes [sizeMapping] to the widget instance identified by [appWidgetId].
 *
 * `RemoteViews(Map<SizeF, RemoteViews>)` is only available on Android 12+ (API 31). Below that,
 * we resolve a single best-fit `RemoteViews` per orientation ourselves from the launcher-reported
 * bounds and hand the system a landscape/portrait pair instead.
 */
fun AppWidgetManager.updateResponsiveAppWidget(
    appWidgetId: Int,
    sizeMapping: Map<SizeF, RemoteViews>,
) {
    if (sizeMapping.isEmpty()) return
    try {
        val views =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                RemoteViews(sizeMapping)
            } else {
                resolveForCurrentBounds(appWidgetId, sizeMapping)
            }
        updateAppWidget(appWidgetId, views)
    } catch (t: Throwable) {
        // Throwable, not Exception: an API mismatch arrives as NoSuchMethodError, which from a
        // background coroutine takes the process down instead of failing one widget update.
        Log.e(TAG, "Failed to update widget instance $appWidgetId: ${t.message}", t)
    }
}

/**
 * Below API 31, [RemoteViews] has no size-mapping constructor. Resolve one variant per
 * orientation from the launcher-reported bounds in [AppWidgetManager.getAppWidgetOptions] and
 * hand back `RemoteViews(landscape, portrait)`, which the system swaps between at layout time -
 * or, when both orientations resolve to the same variant, that single `RemoteViews` directly.
 */
private fun AppWidgetManager.resolveForCurrentBounds(
    appWidgetId: Int,
    sizeMapping: Map<SizeF, RemoteViews>,
): RemoteViews {
    val options = getAppWidgetOptions(appWidgetId)

    val portrait =
        bestFitVariant(
            sizeMapping,
            boxWidth = options.intOrZero(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH),
            boxHeight = options.intOrZero(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT),
        )
    val landscape =
        bestFitVariant(
            sizeMapping,
            boxWidth = options.intOrZero(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH),
            boxHeight = options.intOrZero(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT),
        )

    return if (landscape === portrait) landscape else RemoteViews(landscape, portrait)
}

private fun Bundle?.intOrZero(key: String): Int = this?.getInt(key, 0) ?: 0

/**
 * Picks the variant to show for a box of [boxWidth] x [boxHeight] (dp, matching the
 * `OPTION_APPWIDGET_*` bundle keys), mirroring the platform's own selection in
 * `RemoteViews.findBestFitLayout`: among the variants that fit, take the one closest to the box
 * by squared distance, and fall back to the smallest variant when none fits or the launcher
 * hasn't reported bounds yet (either dimension `<= 0`).
 *
 * Matching the platform matters because API 31+ resolves the same mapping itself — selecting by
 * some other rule here would render a different variant below 31 than above it.
 *
 * Generic in the value type and `internal` so the selection can be unit-tested on its own.
 */
internal fun <T> bestFitVariant(
    variants: Map<SizeF, T>,
    boxWidth: Int,
    boxHeight: Int,
): T {
    val smallest = variants.entries.minBy { it.key.width * it.key.height }.value
    if (boxWidth <= 0 || boxHeight <= 0) return smallest

    return variants.entries
        .filter { fitsIn(it.key, boxWidth, boxHeight) }
        .minByOrNull { squareDistance(it.key, boxWidth, boxHeight) }
        ?.value ?: smallest
}

/** Mirrors `RemoteViews.fitsIn`, including the 1dp tolerance it allows for rounding. */
private fun fitsIn(
    variant: SizeF,
    boxWidth: Int,
    boxHeight: Int,
): Boolean = boxWidth + 1 > variant.width && boxHeight + 1 > variant.height

/** Mirrors `RemoteViews.squareDistance`. */
private fun squareDistance(
    variant: SizeF,
    boxWidth: Int,
    boxHeight: Int,
): Float {
    val dx = variant.width - boxWidth
    val dy = variant.height - boxHeight
    return dx * dx + dy * dy
}
