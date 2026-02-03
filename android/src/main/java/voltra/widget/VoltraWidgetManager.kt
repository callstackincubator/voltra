package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.widget.RemoteViews
import androidx.glance.appwidget.ExperimentalGlanceRemoteViewsApi
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import voltra.glance.RemoteViewsGenerator
import voltra.parsing.VoltraPayloadParser
import java.io.InputStream
import java.nio.charset.Charset

class VoltraWidgetManager(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraWidgetManager"
        private const val PREFS_NAME = "voltra_widgets"
        private const val KEY_JSON_PREFIX = "Voltra_Widget_JSON_"
        private const val KEY_DEEP_LINK_PREFIX = "Voltra_Widget_DeepLinkURL_"
        private const val ASSET_INITIAL_STATES = "voltra_initial_states.json"
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Write widget data to SharedPreferences
     * Uses commit() instead of apply() to ensure data is written before widget update
     */
    fun writeWidgetData(
        widgetId: String,
        jsonString: String,
        deepLinkUrl: String?,
    ) {
        Log.d(TAG, "writeWidgetData: widgetId=$widgetId, deepLinkUrl=$deepLinkUrl")
        Log.d(TAG, "JSON length: ${jsonString.length}, preview: ${jsonString.take(200)}")

        val editor = prefs.edit()
        editor.putString("$KEY_JSON_PREFIX$widgetId", jsonString)

        if (deepLinkUrl != null && deepLinkUrl.isNotEmpty()) {
            editor.putString("$KEY_DEEP_LINK_PREFIX$widgetId", deepLinkUrl)
        } else {
            editor.remove("$KEY_DEEP_LINK_PREFIX$widgetId")
        }

        // Use commit() for synchronous write - ensures data is available before widget update
        val success = editor.commit()
        Log.d(TAG, "Widget data written. Success: $success, length: ${jsonString.length}")
    }

    /**
     * Read widget JSON from SharedPreferences.
     * Falls back to pre-rendered initial state from assets if no dynamic data is found.
     */
    fun readWidgetJson(widgetId: String): String? {
        val json = prefs.getString("$KEY_JSON_PREFIX$widgetId", null)
        if (json != null) {
            Log.d(TAG, "readWidgetJson: widgetId=$widgetId, found in SharedPreferences, length=${json.length}")
            return json
        }

        // Fallback to pre-rendered state from assets
        val preloadedJson = readPreloadedWidgetJson(widgetId)
        if (preloadedJson != null) {
            Log.d(TAG, "readWidgetJson: widgetId=$widgetId, found in assets, length=${preloadedJson.length}")
            return preloadedJson
        }

        Log.d(TAG, "readWidgetJson: widgetId=$widgetId, not found anywhere")
        return null
    }

    /**
     * Read pre-rendered widget JSON from assets
     */
    private fun readPreloadedWidgetJson(widgetId: String): String? =
        try {
            val inputStream: InputStream = context.assets.open(ASSET_INITIAL_STATES)
            val size: Int = inputStream.available()
            val buffer = ByteArray(size)
            inputStream.read(buffer)
            inputStream.close()

            val jsonString = String(buffer, Charset.forName("UTF-8"))
            val jsonObject = JSONObject(jsonString)

            if (jsonObject.has(widgetId)) {
                jsonObject.get(widgetId).toString()
            } else {
                null
            }
        } catch (e: Exception) {
            // Asset might not exist or be invalid, which is fine if no pre-rendering was configured
            null
        }

    /**
     * Read widget deep link URL from SharedPreferences
     */
    fun readDeepLinkUrl(widgetId: String): String? = prefs.getString("$KEY_DEEP_LINK_PREFIX$widgetId", null)

    /**
     * Clear widget data from SharedPreferences
     */
    fun clearWidgetData(widgetId: String) {
        Log.d(TAG, "clearWidgetData: widgetId=$widgetId")

        val editor = prefs.edit()
        editor.remove("$KEY_JSON_PREFIX$widgetId")
        editor.remove("$KEY_DEEP_LINK_PREFIX$widgetId")
        editor.commit()
    }

    /**
     * Clear all widget data from SharedPreferences
     */
    fun clearAllWidgetData() {
        Log.d(TAG, "clearAllWidgetData")

        val allKeys = prefs.all.keys
        val widgetKeys =
            allKeys.filter { key: String ->
                key.startsWith(KEY_JSON_PREFIX) || key.startsWith(KEY_DEEP_LINK_PREFIX)
            }

        val editor = prefs.edit()
        widgetKeys.forEach { key: String -> editor.remove(key) }
        editor.commit()

        Log.d(TAG, "Cleared ${widgetKeys.size} widget keys")
    }

    /**
     * Update a widget directly using GlanceRemoteViews, bypassing Glance's session lock.
     * This allows rapid widget updates without the 45-50 second cooldown.
     * Uses RemoteViews with size mapping for responsive layouts (Android 12+ required).
     */
    @OptIn(ExperimentalGlanceRemoteViewsApi::class)
    suspend fun updateWidgetDirect(widgetId: String) =
        withContext(Dispatchers.IO) {
            Log.d(TAG, "updateWidgetDirect: widgetId=$widgetId")

            // 1. Read and parse the JSON payload
            val jsonString = readWidgetJson(widgetId)
            if (jsonString == null) {
                Log.w(TAG, "No JSON data found for widgetId=$widgetId")
                return@withContext
            }

            val payload =
                try {
                    VoltraPayloadParser.parse(jsonString)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to parse widget payload: ${e.message}", e)
                    return@withContext
                }

            if (payload.variants.isNullOrEmpty()) {
                Log.w(TAG, "No variants in payload for widgetId=$widgetId")
                return@withContext
            }

            // 2. Get widget instances from AppWidgetManager
            val receiverClassName = "${context.packageName}.widget.VoltraWidget_${widgetId}Receiver"
            val componentName = ComponentName(context.packageName, receiverClassName)
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            Log.d(TAG, "Found ${appWidgetIds.size} app widget instances for $widgetId")

            if (appWidgetIds.isEmpty()) {
                Log.w(TAG, "No widget instances found on home screen for $widgetId")
                return@withContext
            }

            // 3. Generate RemoteViews for all variants
            val sizeMapping = RemoteViewsGenerator.generateWidgetRemoteViews(context, payload)

            if (sizeMapping.isEmpty()) {
                Log.e(TAG, "Failed to generate any RemoteViews for widgetId=$widgetId")
                return@withContext
            }

            // 4. Update each widget instance with responsive RemoteViews
            for (appWidgetId in appWidgetIds) {
                try {
                    // Android 12+ (API 31): Use RemoteViews with size mapping for responsive layout
                    // The system will automatically select the appropriate RemoteViews based on current size
                    val responsiveRemoteViews = RemoteViews(sizeMapping)
                    appWidgetManager.updateAppWidget(appWidgetId, responsiveRemoteViews)
                    Log.d(TAG, "Updated widget $appWidgetId with responsive RemoteViews (${sizeMapping.size} sizes)")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update widget instance $appWidgetId: ${e.message}", e)
                }
            }

            Log.d(TAG, "Direct widget update completed for $widgetId")
        }

    /**
     * Update a specific widget using direct RemoteViews generation.
     * This bypasses Glance's session management to avoid the 45-50 second lock.
     *
     * Falls back to Glance's native update if direct update fails.
     */
    suspend fun updateWidget(widgetId: String) =
        withContext(Dispatchers.IO) {
            Log.d(TAG, "updateWidget: widgetId=$widgetId")

            try {
                // Try direct update first (bypasses session lock)
                updateWidgetDirect(widgetId)
            } catch (e: Exception) {
                Log.w(TAG, "Direct widget update failed, falling back to Glance update: ${e.message}")
                // Fallback to Glance's native update mechanism
                updateWidgetViaGlance(widgetId)
            }
        }

    /**
     * Update widget using Glance's native mechanism (has session lock).
     * Kept as fallback for edge cases.
     */
    private suspend fun updateWidgetViaGlance(widgetId: String) {
        Log.d(TAG, "updateWidgetViaGlance: widgetId=$widgetId")

        // Build the receiver component name by convention (no reflection needed)
        val receiverClassName = "${context.packageName}.widget.VoltraWidget_${widgetId}Receiver"
        val componentName = ComponentName(context.packageName, receiverClassName)
        Log.d(TAG, "Looking for receiver: $receiverClassName")

        // Get widget IDs using standard Android AppWidgetManager
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

        Log.d(TAG, "Found ${appWidgetIds.size} app widget instances for $widgetId: ${appWidgetIds.toList()}")

        if (appWidgetIds.isNotEmpty()) {
            // Create the widget instance with the specific widgetId
            val widget = VoltraGlanceWidget(widgetId)

            // Get the GlanceAppWidgetManager to convert IDs
            val glanceManager = GlanceAppWidgetManager(context)

            // Update each widget instance using Glance's update mechanism
            for (appWidgetId in appWidgetIds) {
                try {
                    val glanceId = glanceManager.getGlanceIdBy(appWidgetId)
                    Log.d(TAG, "Updating Glance widget instance: appWidgetId=$appWidgetId, glanceId=$glanceId")
                    widget.update(context, glanceId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update widget instance $appWidgetId: ${e.message}", e)
                }
            }
            Log.d(TAG, "Glance widget update completed for $widgetId")
        } else {
            Log.w(TAG, "No widget instances found on home screen for $widgetId")
        }
    }

    /**
     * Reload specific widgets or all widgets
     */
    suspend fun reloadWidgets(widgetIds: List<String>?) =
        withContext(Dispatchers.Main) {
            if (widgetIds != null && widgetIds.isNotEmpty()) {
                Log.d(TAG, "reloadWidgets: specific widgets ${widgetIds.joinToString()}")
                for (widgetId in widgetIds) {
                    try {
                        updateWidget(widgetId)
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to reload widget $widgetId: ${e.message}")
                    }
                }
            } else {
                Log.d(TAG, "reloadWidgets: all widgets")
                reloadAllWidgets()
            }
        }

    /**
     * Reload all widgets by finding all saved widget data
     */
    suspend fun reloadAllWidgets() =
        withContext(Dispatchers.Main) {
            Log.d(TAG, "reloadAllWidgets")

            // Get all widget IDs from saved data
            val allKeys = prefs.all.keys
            val widgetIds =
                allKeys
                    .filter { it.startsWith(KEY_JSON_PREFIX) }
                    .map { it.removePrefix(KEY_JSON_PREFIX) }
                    .toSet()

            Log.d(TAG, "Found ${widgetIds.size} widgets with saved data: $widgetIds")

            for (widgetId in widgetIds) {
                try {
                    updateWidget(widgetId)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to update widget $widgetId: ${e.message}")
                }
            }
        }
}
