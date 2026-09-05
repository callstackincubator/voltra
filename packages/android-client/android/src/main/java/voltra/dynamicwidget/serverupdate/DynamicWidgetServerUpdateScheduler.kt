package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope
import java.util.concurrent.TimeUnit

/**
 * WorkManager scheduling for server-driven Dynamic Widgets.
 *
 * Its own worker class and its own unique work names, deliberately: the payload engine's work is
 * pinned on devices by class name, and reusing it would mean one release could hand a Dynamic
 * Widget's job to a worker that writes payloads.
 */
object DynamicWidgetServerUpdateScheduler {
    private const val TAG = "VoltraDynamicServerSched"

    internal const val WORK_NAME_PREFIX = "voltra_dynamic_widget_server_"
    internal const val WORK_TAG = "voltra_dynamic_widget_server_update"
    internal const val KEY_WIDGET_ID = "widgetId"

    private const val BACKOFF_SECONDS = 30L

    /**
     * Schedules — or reschedules — periodic fetches from the widget's resolved interval, and runs
     * one now so a freshly placed widget does not sit on its placeholder for 15 minutes.
     *
     * Cancels instead when the widget has nothing to fetch, which is what makes
     * `setWidgetServerUpdate({ enabled: false })` actually stop the work rather than just ignore
     * its results.
     */
    suspend fun schedule(
        context: Context,
        scope: WidgetScope,
        runImmediately: Boolean = true,
    ) {
        val settings = VoltraWidgetServer.resolver(context).resolve(scope)

        if (!settings.shouldFetch) {
            cancel(context, scope)
            Log.d(TAG, "Not scheduling '${scope.widgetId}': no url, or fetching is disabled")
            return
        }

        val request =
            PeriodicWorkRequestBuilder<DynamicWidgetServerUpdateWorker>(
                settings.intervalMinutes,
                TimeUnit.MINUTES,
            ).setInputData(inputData(scope))
                .setConstraints(networkConstraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SECONDS, TimeUnit.SECONDS)
                .addTag(WORK_TAG)
                .build()

        WorkManager
            .getInstance(context)
            .enqueueUniquePeriodicWork(workName(scope), ExistingPeriodicWorkPolicy.UPDATE, request)

        Log.d(TAG, "Scheduled server updates for '${scope.widgetId}' every ${settings.intervalMinutes}min")

        if (runImmediately) {
            requestImmediateUpdate(context, scope)
        }
    }

    /**
     * Runs a fetch as soon as the device allows. Used by the refresh button, by
     * `reloadAndroidWidgets`, and by every settings change, none of which should wait out the
     * remainder of a 15 minute period.
     */
    fun requestImmediateUpdate(
        context: Context,
        scope: WidgetScope,
    ) {
        val request =
            OneTimeWorkRequestBuilder<DynamicWidgetServerUpdateWorker>()
                .setInputData(inputData(scope))
                .setConstraints(networkConstraints())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, BACKOFF_SECONDS, TimeUnit.SECONDS)
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .addTag(WORK_TAG)
                .build()

        WorkManager.getInstance(context).enqueue(request)
    }

    fun cancel(
        context: Context,
        scope: WidgetScope,
    ) {
        WorkManager.getInstance(context).cancelUniqueWork(workName(scope))
    }

    internal fun workName(scope: WidgetScope): String = "$WORK_NAME_PREFIX${scope.storageKey}"

    private fun inputData(scope: WidgetScope): Data = Data.Builder().putString(KEY_WIDGET_ID, scope.widgetId).build()

    private fun networkConstraints(): Constraints =
        Constraints
            .Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
}
