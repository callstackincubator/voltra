package voltra.widget.payload

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import voltra.BuildConfig
import voltra.parsing.VoltraPayloadParser
import voltra.widget.VoltraRefreshActionCallback
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection

/**
 * Real implementation behind the pinned [voltra.widget.VoltraRefreshActionCallback] (ADR 0000):
 * fetches fresh widget content from the server, then pushes updated RemoteViews (with the
 * refresh button) directly via AppWidgetManager.
 *
 * We bypass Glance's update()/session mechanism entirely because it doesn't reliably trigger
 * provideGlance() from ActionCallbacks. Instead we use GlanceRemoteViews.compose() (via
 * [RemoteViewsGenerator]) to generate RemoteViews that include both the widget content and the
 * refresh button overlay, then push them directly.
 */
internal class PayloadRefreshActionCallback {
    companion object {
        // Kept as the original class name (ADR 0000): this TAG predates the package split and is
        // part of existing logcat filters/dashboards.
        private const val TAG = "VoltraRefreshCallback"
    }

    suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val widgetId = parameters[VoltraRefreshActionCallback.KEY_WIDGET_ID]
        if (widgetId == null) {
            Log.e(TAG, "No widget ID in action parameters")
            return
        }

        Log.d(TAG, "Refresh requested for widget '$widgetId'")

        val serverUrl = VoltraWidgetUpdateScheduler.readServerUrl(context, widgetId)
        if (serverUrl == null) {
            Log.w(TAG, "No server URL registered for widget '$widgetId', skipping refresh")
            return
        }

        // Resolve the widget's kind before opening any connection (ADR 0000, mirroring
        // VoltraWidgetUpdateWorker): a Dynamic Widget's placeholder reader never consults this
        // payload store, so fetching for the wrong kind is wasted work.
        when (val kindResolution = VoltraWidgetKindResolver.resolve(context, widgetId)) {
            is VoltraWidgetKindResolution.Unresolved -> {
                Log.w(TAG, "Skipping refresh for widget '$widgetId': ${kindResolution.reason}")
                return
            }

            is VoltraWidgetKindResolution.Resolved -> {
                if (kindResolution.kind != VoltraWidgetKind.Payload) {
                    Log.w(
                        TAG,
                        "Skipping refresh for widget '$widgetId': not a payload-driven widget (${kindResolution.kind})",
                    )
                    return
                }
            }
        }

        val jsonString =
            withContext(Dispatchers.IO) {
                try {
                    val url = VoltraWidgetUpdateRequest.buildUrl(serverUrl, widgetId, context)
                    val connection = url.openConnection() as HttpURLConnection

                    try {
                        connection.requestMethod = "GET"
                        connection.connectTimeout = 10000
                        connection.readTimeout = 10000
                        connection.setRequestProperty("Accept", "application/json")
                        val androidVersion = android.os.Build.VERSION.RELEASE
                        connection.setRequestProperty(
                            "User-Agent",
                            "VoltraWidget/${BuildConfig.VOLTRA_VERSION} (Android/$androidVersion)",
                        )

                        val token = VoltraWidgetCredentialStore.readToken(context)
                        if (token != null) {
                            connection.setRequestProperty("Authorization", "Bearer $token")
                        }
                        VoltraWidgetCredentialStore.readHeaders(context).forEach { (key, value) ->
                            connection.setRequestProperty(key, value)
                        }

                        val responseCode = connection.responseCode
                        if (responseCode !in 200..299) {
                            Log.e(TAG, "Server returned HTTP $responseCode for widget '$widgetId'")
                            return@withContext null
                        }

                        val reader = BufferedReader(InputStreamReader(connection.inputStream))
                        val json = reader.readText()
                        reader.close()

                        if (json.isEmpty()) {
                            Log.e(TAG, "Empty response from server for widget '$widgetId'")
                            return@withContext null
                        }

                        Log.d(TAG, "Received ${json.length} bytes for widget '$widgetId'")
                        json
                    } finally {
                        connection.disconnect()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Refresh failed for widget '$widgetId': ${e.message}", e)
                    null
                }
            } ?: return

        val widgetManager = VoltraWidgetManager(context)
        widgetManager.writeWidgetData(widgetId, jsonString, null)
        Log.d(TAG, "Data stored for widget '$widgetId'")

        val payload =
            try {
                VoltraPayloadParser.parse(jsonString)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse widget payload: ${e.message}", e)
                return
            }

        if (payload.variants.isNullOrEmpty()) {
            Log.w(TAG, "No variants in payload for widget '$widgetId'")
            return
        }

        try {
            val sizeMapping =
                RemoteViewsGenerator.generateWidgetRemoteViewsWithRefresh(
                    context,
                    payload,
                    widgetId,
                )

            if (sizeMapping.isEmpty()) {
                Log.w(TAG, "No RemoteViews generated for widget '$widgetId'")
                return
            }

            val componentName = VoltraWidgetReceivers.componentName(context, widgetId)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                appWidgetManager.updateResponsiveAppWidget(appWidgetId, sizeMapping)
                Log.d(TAG, "Pushed RemoteViews to widget instance $appWidgetId")
            }

            Log.d(TAG, "Refresh completed for widget '$widgetId' (${appWidgetIds.size} instances)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate/push RemoteViews for widget '$widgetId': ${e.message}", e)
        }
    }
}
