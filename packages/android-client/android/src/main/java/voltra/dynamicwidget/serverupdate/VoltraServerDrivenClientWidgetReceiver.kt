package voltra.dynamicwidget.serverupdate

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.runBlocking
import voltra.dynamicwidget.VoltraClientGlanceWidget
import voltra.dynamicwidget.VoltraClientWidgetReceiver

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

        // Recomputing on every onUpdate rather than only onEnabled: it is how a widget picks up an
        // interval the app changed while the widget was not being drawn, and how a placement whose
        // configuration changed while the app was not running moves to its new instance scope
        // (ADR 0007). WorkManager's UPDATE policy makes rescheduling an unchanged scope idempotent.
        //
        // Blocking rather than launching: onReceive must not return before the work is enqueued,
        // or a widget added while the app is not running can lose its schedule entirely -- the
        // process is reclaimed and updatePeriodMillis is 0, so nothing asks again until a reboot.
        // goAsync() is not an option here: GlanceAppWidgetReceiver already consumed it in its own
        // onReceive, and a second call returns null.
        try {
            runBlocking {
                DynamicWidgetServerUpdateScheduler.recompute(context.applicationContext, widgetId)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule server updates for '$widgetId': ${e.message}", e)
        }
    }

    override fun onDeleted(
        context: Context,
        appWidgetIds: IntArray,
    ) {
        // super.onDeleted (VoltraClientWidgetReceiver) clears the deleted placements' instance
        // configuration first, so by the time this recomputes the scope set, VoltraConfigurationStore
        // already reflects the removal and a scope with no placement left is cancelled correctly.
        super.onDeleted(context, appWidgetIds)

        try {
            runBlocking {
                DynamicWidgetServerUpdateScheduler.recompute(context.applicationContext, widgetId)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to recompute server update schedule for '$widgetId': ${e.message}", e)
        }
    }

    private companion object {
        private const val TAG = "VoltraServerDrivenClient"
    }
}
