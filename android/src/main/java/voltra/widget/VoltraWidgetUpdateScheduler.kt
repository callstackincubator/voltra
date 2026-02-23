package voltra.widget

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Schedules and manages periodic WorkManager tasks for server-driven widget updates.
 *
 * Each widget with a serverUpdate configuration gets its own periodic work request
 * that runs at the configured interval to fetch new content from the server.
 */
object VoltraWidgetUpdateScheduler {
    private const val TAG = "VoltraWidgetScheduler"

    /**
     * Schedule periodic server updates for a widget.
     *
     * @param context Application context
     * @param widgetId The widget identifier
     * @param serverUrl The Voltra SSR server URL
     * @param intervalMinutes How often to fetch updates (minimum 15 minutes per WorkManager)
     */
    fun schedulePeriodicUpdate(
        context: Context,
        widgetId: String,
        serverUrl: String,
        intervalMinutes: Long = 15,
    ) {
        val workName = "${VoltraWidgetUpdateWorker.WORK_NAME_PREFIX}$widgetId"

        // Ensure minimum interval is 15 minutes (WorkManager requirement)
        val effectiveInterval = maxOf(intervalMinutes, 15L)

        val inputData =
            Data.Builder()
                .putString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID, widgetId)
                .putString(VoltraWidgetUpdateWorker.KEY_SERVER_URL, serverUrl)
                .build()

        val constraints =
            Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        val workRequest =
            PeriodicWorkRequestBuilder<VoltraWidgetUpdateWorker>(
                effectiveInterval,
                TimeUnit.MINUTES,
            )
                .setInputData(inputData)
                .setConstraints(constraints)
                .build()

        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(
                workName,
                ExistingPeriodicWorkPolicy.UPDATE,
                workRequest,
            )

        Log.d(TAG, "Scheduled periodic update for widget '$widgetId' every ${effectiveInterval}min from $serverUrl")
    }

    /**
     * Cancel periodic server updates for a widget.
     */
    fun cancelPeriodicUpdate(
        context: Context,
        widgetId: String,
    ) {
        val workName = "${VoltraWidgetUpdateWorker.WORK_NAME_PREFIX}$widgetId"
        WorkManager.getInstance(context).cancelUniqueWork(workName)
        Log.d(TAG, "Cancelled periodic update for widget '$widgetId'")
    }

    /**
     * Cancel all periodic widget updates.
     */
    fun cancelAllPeriodicUpdates(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(VoltraWidgetUpdateWorker.TAG)
        Log.d(TAG, "Cancelled all periodic widget updates")
    }
}
