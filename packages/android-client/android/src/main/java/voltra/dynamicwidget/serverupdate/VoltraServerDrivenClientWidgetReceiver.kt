package voltra.dynamicwidget.serverupdate

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import voltra.dynamicwidget.VoltraClientGlanceWidget
import voltra.dynamicwidget.VoltraClientWidgetReceiver
import voltra.widget.server.WidgetScope

/**
 * Receiver generated for a widget that has both an `entry` and a `serverUpdate`.
 *
 * It is still a Dynamic Widget in every way that matters — same kind, same Glance widget, same
 * render path — with two additions: its props are fetched in the background, and its `env` carries
 * how that fetch went.
 */
abstract class VoltraServerDrivenClientWidgetReceiver : VoltraClientWidgetReceiver() {
    override fun createGlanceAppWidget(): GlanceAppWidget =
        VoltraClientGlanceWidget(widgetId, DynamicWidgetServerEnvironmentSource())

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)

        // Scheduling on every onUpdate rather than only onEnabled: WorkManager's UPDATE policy
        // makes it idempotent, and it is how a widget picks up an interval the app changed while
        // the widget was not being drawn.
        //
        // goAsync() keeps the process alive until the work is enqueued. Without it, a widget added
        // while the app is not running can lose its schedule entirely: onUpdate returns, Android
        // is free to reclaim the process, and updatePeriodMillis is 0 so nothing asks again until
        // a reboot.
        val pendingResult = goAsync()
        val applicationContext = context.applicationContext

        CoroutineScope(Dispatchers.Default).launch {
            try {
                DynamicWidgetServerUpdateScheduler.schedule(applicationContext, WidgetScope.of(widgetId))
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule server updates for '$widgetId': ${e.message}", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    override fun onDeleted(
        context: Context,
        appWidgetIds: IntArray,
    ) {
        super.onDeleted(context, appWidgetIds)

        if (remainingInstanceCount(context, appWidgetIds) == 0) {
            DynamicWidgetServerUpdateScheduler.cancel(context.applicationContext, WidgetScope.of(widgetId))
        }
    }

    private fun remainingInstanceCount(
        context: Context,
        deletedIds: IntArray,
    ): Int =
        try {
            AppWidgetManager
                .getInstance(context)
                .getAppWidgetIds(ComponentName(context, this::class.java))
                .count { it !in deletedIds }
        } catch (e: Exception) {
            Log.w(TAG, "Could not count remaining instances of '$widgetId': ${e.message}")
            // Leaving the work scheduled is the safer guess: the worker cancels itself when it
            // finds nothing to do, whereas cancelling here would silently stop a live widget.
            1
        }

    private companion object {
        private const val TAG = "VoltraServerDrivenClient"
    }
}
