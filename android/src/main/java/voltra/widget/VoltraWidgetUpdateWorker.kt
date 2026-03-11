package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.res.Configuration
import android.util.Log
import android.widget.RemoteViews
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.BuildConfig
import voltra.glance.RemoteViewsGenerator
import voltra.parsing.VoltraPayloadParser
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Background Worker that fetches widget content from a remote Voltra SSR server
 * and pushes updates to the widget via AppWidgetManager.
 *
 * This worker:
 * 1. Reads auth credentials from DataStore
 * 2. Performs an HTTP GET request to the configured server URL
 * 3. Parses the response JSON (Voltra widget payload)
 * 4. Generates RemoteViews and updates the widget directly
 *
 * Scheduled via WorkManager PeriodicWorkRequest from the widget receiver.
 */
class VoltraWidgetUpdateWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    companion object {
        const val TAG = "VoltraWidgetUpdateWorker"
        const val KEY_WIDGET_ID = "widget_id"
        const val KEY_SERVER_URL = "server_url"
        const val WORK_NAME_PREFIX = "voltra_widget_update_"

        /** Stop retrying after this many consecutive failures to avoid infinite retry loops. */
        const val MAX_RETRIES = 3
    }

    override suspend fun doWork(): Result =
        withContext(Dispatchers.IO) {
            val widgetId = inputData.getString(KEY_WIDGET_ID)
            val serverUrl = inputData.getString(KEY_SERVER_URL)

            if (widgetId == null || serverUrl == null) {
                Log.e(TAG, "Missing required input data: widgetId=$widgetId, serverUrl=$serverUrl")
                return@withContext Result.failure()
            }

            Log.d(TAG, "Starting server update for widget '$widgetId' from $serverUrl")

            try {
                // 1. Build URL with query parameters
                val nightModeFlags =
                    applicationContext.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
                val theme = if (nightModeFlags == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"

                val urlBuilder = StringBuilder(serverUrl)
                urlBuilder.append(if (serverUrl.contains("?")) "&" else "?")
                urlBuilder.append("widgetId=").append(widgetId)
                urlBuilder.append("&platform=android")
                urlBuilder.append("&theme=").append(theme)

                val url = URL(urlBuilder.toString())
                val connection = url.openConnection() as HttpURLConnection

                try {
                    connection.requestMethod = "GET"
                    connection.connectTimeout = 15000
                    connection.readTimeout = 15000
                    connection.setRequestProperty("Accept", "application/json")
                    val androidVersion = android.os.Build.VERSION.RELEASE
                    connection.setRequestProperty(
                        "User-Agent",
                        "VoltraWidget/${BuildConfig.VOLTRA_VERSION} (Android/$androidVersion)",
                    )

                    // 2. Add auth token from encrypted storage
                    val token = VoltraWidgetCredentialStore.readToken(applicationContext)
                    if (token != null) {
                        connection.setRequestProperty("Authorization", "Bearer $token")
                    }

                    // 3. Add custom headers from encrypted storage
                    val headers = VoltraWidgetCredentialStore.readHeaders(applicationContext)
                    headers.forEach { (key, value) ->
                        connection.setRequestProperty(key, value)
                    }

                    // 4. Execute request
                    val responseCode = connection.responseCode
                    if (responseCode !in 200..299) {
                        Log.e(
                            TAG,
                            "Server returned HTTP $responseCode for widget '$widgetId' (attempt $runAttemptCount)",
                        )
                        return@withContext if (runAttemptCount >= MAX_RETRIES) {
                            Log.w(TAG, "Max retries ($MAX_RETRIES) reached for widget '$widgetId', giving up")
                            Result.failure()
                        } else {
                            Result.retry()
                        }
                    }

                    // 5. Read response
                    val reader = BufferedReader(InputStreamReader(connection.inputStream))
                    val jsonString = reader.readText()
                    reader.close()

                    if (jsonString.isEmpty()) {
                        Log.e(TAG, "Empty response from server for widget '$widgetId' (attempt $runAttemptCount)")
                        return@withContext if (runAttemptCount >= MAX_RETRIES) {
                            Log.w(TAG, "Max retries ($MAX_RETRIES) reached for widget '$widgetId', giving up")
                            Result.failure()
                        } else {
                            Result.retry()
                        }
                    }

                    Log.d(TAG, "Received ${jsonString.length} bytes for widget '$widgetId'")

                    // 6. Store the fetched data in SharedPreferences (for Glance fallback)
                    val widgetManager = VoltraWidgetManager(applicationContext)
                    widgetManager.writeWidgetData(widgetId, jsonString, null)

                    // 7. Parse and generate RemoteViews for direct update
                    val payload =
                        try {
                            VoltraPayloadParser.parse(jsonString)
                        } catch (e: Exception) {
                            Log.e(TAG, "Failed to parse widget payload: ${e.message}", e)
                            // Data is stored, so Glance can still use it. Return success.
                            return@withContext Result.success()
                        }

                    if (payload.variants.isNullOrEmpty()) {
                        Log.w(TAG, "No variants in payload for widget '$widgetId'")
                        return@withContext Result.success()
                    }

                    // 8. Push update to widget via AppWidgetManager
                    val receiverClassName =
                        "${applicationContext.packageName}.widget.VoltraWidget_${widgetId}Receiver"
                    val componentName = ComponentName(applicationContext.packageName, receiverClassName)
                    val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                    val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                    if (appWidgetIds.isEmpty()) {
                        Log.w(TAG, "No widget instances found on home screen for '$widgetId'")
                        return@withContext Result.success()
                    }

                    val sizeMapping = RemoteViewsGenerator.generateWidgetRemoteViews(applicationContext, payload)

                    if (sizeMapping.isNotEmpty()) {
                        for (appWidgetId in appWidgetIds) {
                            try {
                                val responsiveRemoteViews = RemoteViews(sizeMapping)
                                appWidgetManager.updateAppWidget(appWidgetId, responsiveRemoteViews)
                                Log.d(TAG, "Updated widget instance $appWidgetId with server data")
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to update widget instance $appWidgetId: ${e.message}", e)
                            }
                        }
                    }

                    Log.d(TAG, "Server update completed successfully for widget '$widgetId'")
                    Result.success()
                } finally {
                    connection.disconnect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server update failed for widget '$widgetId' (attempt $runAttemptCount): ${e.message}", e)
                if (runAttemptCount >= MAX_RETRIES) {
                    Log.w(TAG, "Max retries ($MAX_RETRIES) reached for widget '$widgetId', giving up")
                    Result.failure()
                } else {
                    Result.retry()
                }
            }
        }
}
