package voltra.widget

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
 * Picks the largest-area variant that fits within [boxWidth] x [boxHeight] (dp, matching the
 * `OPTION_APPWIDGET_*` bundle keys). Falls back to the smallest-area variant when nothing fits,
 * or when the box isn't known yet (either dimension `<= 0`).
 */
private fun bestFitVariant(
    sizeMapping: Map<SizeF, RemoteViews>,
    boxWidth: Int,
    boxHeight: Int,
): RemoteViews {
    val area: (Map.Entry<SizeF, RemoteViews>) -> Float = { it.key.width * it.key.height }

    val fitting =
        if (boxWidth > 0 && boxHeight > 0) {
            sizeMapping.filterKeys { it.width <= boxWidth && it.height <= boxHeight }
        } else {
            emptyMap()
        }

    return if (fitting.isEmpty()) {
        sizeMapping.entries.minBy(area).value
    } else {
        fitting.entries.maxBy(area).value
    }
}
