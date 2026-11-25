package voltra.dynamicwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import voltra.WidgetOrchestrator

private const val TAG = "DynamicWidgetGlanceUpdate"

/**
 * Redraws a Dynamic Widget at the dates its entry's `timeline(props)` export lists, between props
 * updates: the Android counterpart of the iOS timeline entries. One alarm per placement, since
 * placements can show different props, set to the next date after each render, so the redraw it
 * causes sets the one after.
 */
internal object DynamicWidgetTimelineAlarm {
    internal const val WINDOW_MS = 60_000L

    fun schedule(
        context: Context,
        widgetId: String,
        appWidgetId: Int?,
        propsJson: String,
        now: Long = System.currentTimeMillis(),
        timelineDates: (String, String) -> List<Long> = VoltraJSRenderer::timelineDates,
    ) {
        val next = timelineDates(widgetId, propsJson).filter { it > now }.minOrNull()
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        if (next == null) {
            alarmManager.cancel(pendingIntent(context, widgetId, appWidgetId))
            return
        }
        // Non-waking, so a sleeping phone redraws when it wakes, which is when the widget can be seen
        // anyway. A window rather than set(), which may defer up to 75% of the wait (capped at an
        // hour); without the exact-alarm permission Android 12+ stretches it to about 10 minutes.
        alarmManager.setWindow(AlarmManager.RTC, next, WINDOW_MS, pendingIntent(context, widgetId, appWidgetId))
        Log.d(TAG, "Timeline redraw for '$widgetId' instance $appWidgetId set for $next (in ${next - now} ms)")
    }

    fun cancel(
        context: Context,
        widgetId: String,
        appWidgetId: Int?,
    ) {
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, widgetId, appWidgetId))
    }

    // The ids ride in the data URI, which keeps one PendingIntent per placement, so a new schedule
    // replaces the old one.
    private fun pendingIntent(
        context: Context,
        widgetId: String,
        appWidgetId: Int?,
    ): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            0,
            Intent(context, DynamicWidgetTimelineReceiver::class.java)
                .setData(Uri.fromParts("voltra-timeline", widgetId, appWidgetId?.toString())),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
}

/**
 * Declared in the library manifest. Fired by [DynamicWidgetTimelineAlarm], and on a clock change,
 * which leaves a pending alarm at a date picked from the old clock: a clock moved back by hours
 * would otherwise freeze the widget until its next props update.
 */
class DynamicWidgetTimelineReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val widgetId = intent.data?.schemeSpecificPart
        val appWidgetId = intent.data?.fragment?.toIntOrNull()
        if (widgetId == null && intent.action != Intent.ACTION_TIME_CHANGED) return

        Log.d(TAG, "Timeline redraw for '${widgetId ?: "every Dynamic Widget, clock changed"}' instance $appWidgetId")
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.Main).launch {
            try {
                // The same redraw a props update does; env.date is read during it, so it is now,
                // and the render sets the next alarm.
                when {
                    widgetId == null -> WidgetOrchestrator(appContext).reloadClientWidgets()
                    appWidgetId == null -> triggerDynamicWidgetGlanceUpdate(appContext, widgetId)
                    else -> triggerDynamicWidgetGlanceUpdateForPlacements(appContext, widgetId) { it == appWidgetId }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Timeline redraw failed for '$widgetId': ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }
}
