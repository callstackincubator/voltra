package voltra.dynamicwidget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import androidx.annotation.VisibleForTesting
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.concurrent.ConcurrentHashMap

private const val TAG = "DynamicWidgetGlanceUpdate"

/**
 * Redraws a Dynamic Widget at the dates its entry's `timeline(props)` export lists, between props
 * updates: the Android counterpart of the iOS timeline entries. One alarm per placement, since
 * placements can show different props, set to the next date, so the redraw it causes sets the
 * one after.
 */
internal object DynamicWidgetTimelineAlarm {
    /** Android 12+ stretches a shorter window to 10 minutes without the exact-alarm permission. */
    internal const val WINDOW_MS = 10 * 60_000L

    // The props and next date each placement was last scheduled for. A redraw composes once per
    // size and every composition calls [schedule], so only the first one does the work.
    private val scheduled = ConcurrentHashMap<String, Pair<String, Long?>>()

    fun schedule(
        context: Context,
        widgetId: String,
        appWidgetId: Int?,
        propsJson: String,
        now: Long = System.currentTimeMillis(),
        timelineDates: (String, String) -> List<Long>? = VoltraJSRenderer::timelineDates,
    ) {
        val key = key(widgetId, appWidgetId)
        scheduled[key]?.let { (props, next) ->
            if (props == propsJson && (next == null || next > now)) return
        }

        val dates =
            try {
                timelineDates(widgetId, propsJson)
            } catch (e: Exception) {
                Log.e(TAG, "timeline() failed for '$widgetId' instance $appWidgetId: ${e.message}")
                emptyList()
            }
        // No `timeline` export: nothing to schedule, and nothing pending to cancel.
        if (dates == null) {
            scheduled[key] = propsJson to null
            return
        }

        val next = dates.filter { it > now }.minOrNull()
        scheduled[key] = propsJson to next
        val alarmManager = context.getSystemService(AlarmManager::class.java)
        if (next == null) {
            alarmManager.cancel(pendingIntent(context, widgetId, appWidgetId))
            return
        }
        // Non-waking, so a sleeping phone redraws when it wakes, which is when the widget can be seen
        // anyway. A window rather than set(), which may defer up to 75% of the wait (capped at an hour).
        alarmManager.setWindow(AlarmManager.RTC, next, WINDOW_MS, pendingIntent(context, widgetId, appWidgetId))
        Log.d(TAG, "Timeline redraw for '$widgetId' instance $appWidgetId set for $next (in ${next - now} ms)")
    }

    fun cancel(
        context: Context,
        widgetId: String,
        appWidgetId: Int?,
    ) {
        scheduled.remove(key(widgetId, appWidgetId))
        context.getSystemService(AlarmManager::class.java).cancel(pendingIntent(context, widgetId, appWidgetId))
    }

    @VisibleForTesting
    internal fun clearForTesting() = scheduled.clear()

    private fun key(
        widgetId: String,
        appWidgetId: Int?,
    ) = "$widgetId#$appWidgetId"

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

/** Declared in the library manifest. Fired by [DynamicWidgetTimelineAlarm]. */
class DynamicWidgetTimelineReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        val widgetId = intent.data?.schemeSpecificPart ?: return
        val appWidgetId = intent.data?.fragment?.toIntOrNull()

        Log.d(TAG, "Timeline redraw for '$widgetId' instance $appWidgetId")
        val pendingResult = goAsync()
        val appContext = context.applicationContext
        CoroutineScope(Dispatchers.Main).launch {
            try {
                // The same redraw a props update does; env.date is read during it, so it is now,
                // and the redraw sets the next alarm.
                if (appWidgetId == null) {
                    triggerDynamicWidgetGlanceUpdate(appContext, widgetId)
                } else {
                    triggerDynamicWidgetGlanceUpdateForPlacements(appContext, widgetId) { it == appWidgetId }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Timeline redraw failed for '$widgetId': ${e.message}")
            } finally {
                pendingResult.finish()
            }
        }
    }
}
