package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Build
import android.util.Log
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import voltra.widget.VoltraWidgetReceivers

/**
 * Sizes the launcher has actually given a Dynamic Widget's instances.
 *
 * Used by the trial render to pick an environment the user will really see. The smallest instance
 * is chosen because it is the one most likely to exercise a widget's compact layout branch, which
 * is where a size-dependent render error tends to live.
 */
internal object DynamicWidgetInstanceSizes {
    private const val TAG = "VoltraDynamicSizes"

    fun smallestPlacedSize(
        context: Context,
        dynamicWidgetId: String,
    ): DpSize? =
        try {
            val manager = AppWidgetManager.getInstance(context)
            val component = VoltraWidgetReceivers.componentName(context, dynamicWidgetId)

            manager
                .getAppWidgetIds(component)
                .toList()
                .mapNotNull { appWidgetId -> minimumSize(manager, appWidgetId) }
                .minByOrNull { size -> size.width.value * size.height.value }
        } catch (e: Exception) {
            Log.w(TAG, "Could not read placed sizes for '$dynamicWidgetId': ${e.message}")
            null
        }

    private fun minimumSize(
        manager: AppWidgetManager,
        appWidgetId: Int,
    ): DpSize? {
        val options = manager.getAppWidgetOptions(appWidgetId) ?: return null

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val sizes = options.getParcelableArrayList<android.util.SizeF>(AppWidgetManager.OPTION_APPWIDGET_SIZES)

            sizes
                ?.minByOrNull { it.width * it.height }
                ?.let { return DpSize(it.width.dp, it.height.dp) }
        }

        val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)

        if (width <= 0 || height <= 0) return null

        return DpSize(width.dp, height.dp)
    }
}
