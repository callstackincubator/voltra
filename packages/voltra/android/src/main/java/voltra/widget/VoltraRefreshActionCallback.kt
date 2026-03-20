package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.res.Configuration
import android.util.Log
import android.widget.RemoteViews
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
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
 * Glance ActionCallback that fetches fresh widget content from the server,
 * then pushes updated RemoteViews (with refresh button) directly via AppWidgetManager.
 *
 * We bypass Glance's update()/session mechanism entirely because it doesn't reliably
 * trigger provideGlance() from ActionCallbacks. Instead we use GlanceRemoteViews.compose()
 * to generate RemoteViews that include both the widget content and the refresh button overlay,
 * then push them directly.
 */
class VoltraRefreshActionCallback : ActionCallback {
    companion object {
        private const val TAG = "VoltraRefreshCallback"
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_widget_id")
    }

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val widgetId = parameters[KEY_WIDGET_ID]
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

        val jsonString =
            withContext(Dispatchers.IO) {
                try {
                    val nightModeFlags =
                        context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
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

            val receiverClassName =
                "${context.packageName}.widget.VoltraWidget_${widgetId}Receiver"
            val componentName = ComponentName(context.packageName, receiverClassName)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            for (appWidgetId in appWidgetIds) {
                try {
                    val responsiveRemoteViews = RemoteViews(sizeMapping)
                    appWidgetManager.updateAppWidget(appWidgetId, responsiveRemoteViews)
                    Log.d(TAG, "Pushed RemoteViews to widget instance $appWidgetId")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update widget instance $appWidgetId: ${e.message}", e)
                }
            }

            Log.d(TAG, "Refresh completed for widget '$widgetId' (${appWidgetIds.size} instances)")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to generate/push RemoteViews for widget '$widgetId': ${e.message}", e)
        }
    }
}
