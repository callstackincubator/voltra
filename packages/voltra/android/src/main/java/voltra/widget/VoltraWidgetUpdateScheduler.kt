package voltra.widget

import android.content.Context
import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import java.util.concurrent.TimeUnit

private val Context.voltraServerUrlsDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "voltra_widget_server_urls",
)

/**
 * Schedules and manages periodic WorkManager tasks for server-driven widget updates.
 *
 * Each widget with a serverUpdate configuration gets its own periodic work request
 * that runs at the configured interval to fetch new content from the server.
 *
 * Server URLs are persisted in Jetpack DataStore so that [requestImmediateUpdate]
 * can trigger an on-demand fetch without needing the generated receiver code.
 */
object VoltraWidgetUpdateScheduler {
    private const val TAG = "VoltraWidgetScheduler"

    /** DataStore key that holds the set of all registered widget IDs. */
    private val KEY_WIDGET_IDS = stringSetPreferencesKey("registered_widget_ids")

    /** Prefix used to build per-widget server URL keys. */
    private const val KEY_SERVER_URL_PREFIX = "server_url_"

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
        // Persist the server URL so requestImmediateUpdate can look it up later
        runBlocking { saveServerUrl(context, widgetId, serverUrl) }

        val workName = "${VoltraWidgetUpdateWorker.WORK_NAME_PREFIX}$widgetId"

        // Ensure minimum interval is 15 minutes (WorkManager requirement)
        val effectiveInterval = maxOf(intervalMinutes, 15L)

        val inputData =
            Data
                .Builder()
                .putString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID, widgetId)
                .putString(VoltraWidgetUpdateWorker.KEY_SERVER_URL, serverUrl)
                .build()

        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        val workRequest =
            PeriodicWorkRequestBuilder<VoltraWidgetUpdateWorker>(
                effectiveInterval,
                TimeUnit.MINUTES,
            ).setInputData(inputData)
                .setConstraints(constraints)
                .addTag(VoltraWidgetUpdateWorker.TAG)
                .build()

        WorkManager
            .getInstance(context)
            .enqueueUniquePeriodicWork(
                workName,
                ExistingPeriodicWorkPolicy.UPDATE,
                workRequest,
            )

        Log.d(TAG, "Scheduled periodic update for widget '$widgetId' every ${effectiveInterval}min from $serverUrl")
    }

    /**
     * Enqueue a one-time WorkManager request to immediately fetch fresh content
     * from the server for the given widget.
     *
     * @return true if the request was enqueued, false if no server URL is known for this widget.
     */
    suspend fun requestImmediateUpdate(
        context: Context,
        widgetId: String,
    ): Boolean {
        val serverUrl = readServerUrl(context, widgetId)
        if (serverUrl == null) {
            Log.d(TAG, "No server URL registered for widget '$widgetId', skipping immediate update")
            return false
        }

        val inputData =
            Data
                .Builder()
                .putString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID, widgetId)
                .putString(VoltraWidgetUpdateWorker.KEY_SERVER_URL, serverUrl)
                .build()

        val constraints =
            Constraints
                .Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

        val workRequest =
            OneTimeWorkRequestBuilder<VoltraWidgetUpdateWorker>()
                .setInputData(inputData)
                .setConstraints(constraints)
                .addTag(VoltraWidgetUpdateWorker.TAG)
                .build()

        WorkManager.getInstance(context).enqueue(workRequest)

        Log.d(TAG, "Enqueued immediate update for widget '$widgetId' from $serverUrl")
        return true
    }

    /**
     * Check whether a widget has a server URL registered (i.e. is server-driven).
     */
    suspend fun hasServerUrl(
        context: Context,
        widgetId: String,
    ): Boolean = readServerUrl(context, widgetId) != null

    /**
     * Cancel periodic server updates for a widget.
     */
    fun cancelPeriodicUpdate(
        context: Context,
        widgetId: String,
    ) {
        val workName = "${VoltraWidgetUpdateWorker.WORK_NAME_PREFIX}$widgetId"
        WorkManager.getInstance(context).cancelUniqueWork(workName)
        runBlocking { removeServerUrl(context, widgetId) }
        Log.d(TAG, "Cancelled periodic update for widget '$widgetId'")
    }

    /**
     * Cancel all periodic widget updates.
     */
    fun cancelAllPeriodicUpdates(context: Context) {
        WorkManager.getInstance(context).cancelAllWorkByTag(VoltraWidgetUpdateWorker.TAG)
        runBlocking { clearAllServerUrls(context) }
        Log.d(TAG, "Cancelled all periodic widget updates")
    }

    // -- DataStore helpers for server URL persistence --

    private suspend fun saveServerUrl(
        context: Context,
        widgetId: String,
        serverUrl: String,
    ) {
        val urlKey = stringPreferencesKey("$KEY_SERVER_URL_PREFIX$widgetId")
        context.voltraServerUrlsDataStore.edit { prefs ->
            prefs[urlKey] = serverUrl
            // Also track the widget ID in the index set
            val currentIds = prefs[KEY_WIDGET_IDS] ?: emptySet()
            prefs[KEY_WIDGET_IDS] = currentIds + widgetId
        }
    }

    suspend fun readServerUrl(
        context: Context,
        widgetId: String,
    ): String? {
        val urlKey = stringPreferencesKey("$KEY_SERVER_URL_PREFIX$widgetId")
        return try {
            context.voltraServerUrlsDataStore.data
                .map { prefs -> prefs[urlKey] }
                .firstOrNull()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read server URL for widget '$widgetId': ${e.message}", e)
            null
        }
    }

    /**
     * Return all widget IDs that have a server URL registered.
     */
    suspend fun getAllServerDrivenWidgetIds(context: Context): Set<String> =
        try {
            context.voltraServerUrlsDataStore.data
                .map { prefs -> prefs[KEY_WIDGET_IDS] ?: emptySet() }
                .firstOrNull() ?: emptySet()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read server-driven widget IDs: ${e.message}", e)
            emptySet()
        }

    private suspend fun removeServerUrl(
        context: Context,
        widgetId: String,
    ) {
        val urlKey = stringPreferencesKey("$KEY_SERVER_URL_PREFIX$widgetId")
        context.voltraServerUrlsDataStore.edit { prefs ->
            prefs.remove(urlKey)
            val currentIds = prefs[KEY_WIDGET_IDS] ?: emptySet()
            prefs[KEY_WIDGET_IDS] = currentIds - widgetId
        }
    }

    private suspend fun clearAllServerUrls(context: Context) {
        context.voltraServerUrlsDataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
