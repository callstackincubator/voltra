package voltra.widget.payload

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import voltra.widget.VoltraWidgetUpdateWorker
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import java.util.concurrent.TimeUnit

/**
 * Schedules periodic WorkManager tasks for payload-driven widgets that fetch from a server.
 *
 * The URL and interval used to be inlined into each generated receiver and copied into a
 * DataStore. They now come from the settings resolver, which is what lets an app change either at
 * runtime with `setWidgetServerUpdate`: a receiver compiled months ago cannot be asked what the
 * interval is now.
 */
object VoltraWidgetUpdateScheduler {
    private const val TAG = "VoltraWidgetScheduler"

    /**
     * Schedules — or reschedules — periodic updates from the widget's resolved settings, and
     * cancels instead when it has nothing to fetch. Called from the generated receiver's
     * `onUpdate`, and again whenever settings change.
     */
    suspend fun schedulePeriodicUpdate(
        context: Context,
        widgetId: String,
    ) {
        val scope = WidgetScope.of(widgetId)
        val settings = VoltraWidgetServer.resolver(context).resolve(scope)

        if (!settings.shouldFetch) {
            cancelPeriodicUpdate(context, widgetId)
            Log.d(TAG, "Not scheduling '$widgetId': no url, or fetching is disabled")
            return
        }

        val request =
            PeriodicWorkRequestBuilder<VoltraWidgetUpdateWorker>(settings.intervalMinutes, TimeUnit.MINUTES)
                .setInputData(inputData(widgetId))
                .setConstraints(networkConstraints())
                .addTag(VoltraWidgetUpdateWorker.TAG)
                .build()

        WorkManager
            .getInstance(context)
            .enqueueUniquePeriodicWork(workName(widgetId), ExistingPeriodicWorkPolicy.UPDATE, request)

        Log.d(TAG, "Scheduled periodic update for widget '$widgetId' every ${settings.intervalMinutes}min")
    }

    /**
     * Enqueues a one-time fetch.
     *
     * @return false when the widget has nothing to fetch, so the caller can fall back to
     *   re-rendering whatever payload it already has.
     */
    suspend fun requestImmediateUpdate(
        context: Context,
        widgetId: String,
    ): Boolean {
        val settings = VoltraWidgetServer.resolver(context).resolve(WidgetScope.of(widgetId))

        if (!settings.shouldFetch) {
            Log.d(TAG, "No server url for widget '$widgetId', skipping immediate update")
            return false
        }

        val request =
            OneTimeWorkRequestBuilder<VoltraWidgetUpdateWorker>()
                .setInputData(inputData(widgetId))
                .setConstraints(networkConstraints())
                .addTag(VoltraWidgetUpdateWorker.TAG)
                .build()

        WorkManager.getInstance(context).enqueue(request)

        Log.d(TAG, "Enqueued immediate update for widget '$widgetId'")
        return true
    }

    /** Whether this widget has somewhere to fetch from and permission to do it. */
    suspend fun hasServerUrl(
        context: Context,
        widgetId: String,
    ): Boolean = VoltraWidgetServer.resolver(context).resolve(WidgetScope.of(widgetId)).shouldFetch

    fun cancelPeriodicUpdate(
        context: Context,
        widgetId: String,
    ) {
        WorkManager.getInstance(context).cancelUniqueWork(workName(widgetId))
        Log.d(TAG, "Cancelled periodic update for widget '$widgetId'")
    }

    fun cancelAllPeriodicUpdates(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(VoltraWidgetUpdateWorker.TAG)
        Log.d(TAG, "Cancelled all periodic widget updates")
    }

    /**
     * Whether the widget draws a refresh button. Build-time only: the button is generated UI
     * structure, so unlike the URL and the interval it cannot be changed at runtime.
     */
    fun isRefreshEnabled(
        context: Context,
        widgetId: String,
    ): Boolean = VoltraWidgetServer.defaults(context).defaults(widgetId)?.refresh ?: false

    /** Every widget app.json marked server-driven, whichever engine renders it. */
    fun getAllServerDrivenWidgetIds(context: Context): Set<String> = VoltraWidgetServer.serverDrivenWidgetIds(context)

    private fun workName(widgetId: String) = "${VoltraWidgetUpdateWorker.WORK_NAME_PREFIX}$widgetId"

    private fun inputData(widgetId: String): Data =
        Data
            .Builder()
            .putString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID, widgetId)
            .build()

    private fun networkConstraints(): Constraints =
        Constraints
            .Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
}
