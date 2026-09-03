package voltra.widget.payload

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.work.Data
import androidx.work.ListenableWorker.Result
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.BuildConfig
import voltra.parsing.VoltraPayloadParser
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers
import voltra.widget.VoltraWidgetUpdateWorker
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection

/**
 * Real implementation behind the pinned [voltra.widget.VoltraWidgetUpdateWorker] (ADR 0000):
 * fetches widget content from a remote Voltra SSR server and pushes updates to the widget via
 * AppWidgetManager. Split out so the pinned worker class stays a thin delegate, and this
 * payload-only logic can live in `voltra.widget.payload` with the rest of the payload engine.
 */
internal object PayloadWidgetUpdateWorker {
    // Kept as the original class name (ADR 0000): this TAG predates the package split and is
    // part of existing logcat filters/dashboards.
    private const val TAG = "VoltraWidgetUpdateWorker"

    suspend fun performUpdate(
        applicationContext: Context,
        inputData: Data,
        runAttemptCount: Int,
    ): Result =
        withContext(Dispatchers.IO) {
            val widgetId = inputData.getString(VoltraWidgetUpdateWorker.KEY_WIDGET_ID)
            val serverUrl = inputData.getString(VoltraWidgetUpdateWorker.KEY_SERVER_URL)

            if (widgetId == null || serverUrl == null) {
                Log.e(TAG, "Missing required input data: widgetId=$widgetId, serverUrl=$serverUrl")
                return@withContext Result.failure()
            }

            Log.d(TAG, "Starting server update for widget '$widgetId' from $serverUrl")

            // Resolve the widget's kind before opening any connection (ADR 0000): a Dynamic
            // Widget's placeholder reader never consults this payload store, so fetching for the
            // wrong kind is wasted work, and neither an unresolved id nor a kind mismatch should
            // fail the periodic chain -- there is nothing to retry.
            when (val kindResolution = VoltraWidgetKindResolver.resolve(applicationContext, widgetId)) {
                is VoltraWidgetKindResolution.Unresolved -> {
                    Log.w(TAG, "Skipping server update for widget '$widgetId': ${kindResolution.reason}")
                    return@withContext Result.success()
                }

                is VoltraWidgetKindResolution.Resolved -> {
                    if (kindResolution.kind != VoltraWidgetKind.Payload) {
                        Log.w(
                            TAG,
                            "Skipping server update for widget '$widgetId': not a payload-driven widget " +
                                "(${kindResolution.kind}). Cancelling its periodic update.",
                        )
                        VoltraWidgetUpdateScheduler.cancelPeriodicUpdate(applicationContext, widgetId)
                        return@withContext Result.success()
                    }
                }
            }

            try {
                // 1. Build URL with query parameters
                val url = VoltraWidgetUpdateRequest.buildUrl(serverUrl, widgetId, applicationContext)
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
                        return@withContext if (runAttemptCount >= VoltraWidgetUpdateWorker.MAX_RETRIES) {
                            Log.w(
                                TAG,
                                "Max retries (${VoltraWidgetUpdateWorker.MAX_RETRIES}) reached for widget " +
                                    "'$widgetId', giving up",
                            )
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
                        return@withContext if (runAttemptCount >= VoltraWidgetUpdateWorker.MAX_RETRIES) {
                            Log.w(
                                TAG,
                                "Max retries (${VoltraWidgetUpdateWorker.MAX_RETRIES}) reached for widget " +
                                    "'$widgetId', giving up",
                            )
                            Result.failure()
                        } else {
                            Result.retry()
                        }
                    }

                    Log.d(TAG, "Received ${jsonString.length} bytes for widget '$widgetId'")

                    // 6. Store the fetched data in SharedPreferences (for Glance fallback)
                    val widgetManager = VoltraWidgetManager(applicationContext)
                    widgetManager.writeWidgetData(widgetId, jsonString, null)

                    // 7. Parse payload to validate it (also needed for non-Glance RemoteViews path)
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

                    // 8. Check if this widget uses the Glance refresh overlay
                    val refreshEnabled = VoltraWidgetUpdateScheduler.isRefreshEnabled(applicationContext, widgetId)

                    val sizeMapping =
                        if (refreshEnabled) {
                            // Generate RemoteViews with refresh button overlay
                            RemoteViewsGenerator.generateWidgetRemoteViewsWithRefresh(
                                applicationContext,
                                payload,
                                widgetId,
                            )
                        } else {
                            // Generate plain RemoteViews without refresh overlay
                            RemoteViewsGenerator.generateWidgetRemoteViews(applicationContext, payload)
                        }

                    val componentName = VoltraWidgetReceivers.componentName(applicationContext, widgetId)
                    val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
                    val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

                    if (appWidgetIds.isEmpty()) {
                        Log.w(TAG, "No widget instances found on home screen for '$widgetId'")
                    } else if (sizeMapping.isNotEmpty()) {
                        for (appWidgetId in appWidgetIds) {
                            appWidgetManager.updateResponsiveAppWidget(appWidgetId, sizeMapping)
                            Log.d(TAG, "Updated widget instance $appWidgetId with server data")
                        }
                    }

                    Log.d(TAG, "Server update completed successfully for widget '$widgetId'")
                    Result.success()
                } finally {
                    connection.disconnect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Server update failed for widget '$widgetId' (attempt $runAttemptCount): ${e.message}", e)
                if (runAttemptCount >= VoltraWidgetUpdateWorker.MAX_RETRIES) {
                    Log.w(
                        TAG,
                        "Max retries (${VoltraWidgetUpdateWorker.MAX_RETRIES}) reached for widget " +
                            "'$widgetId', giving up",
                    )
                    Result.failure()
                } else {
                    Result.retry()
                }
            }
        }
}
