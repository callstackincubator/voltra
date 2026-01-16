package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidgetManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class VoltraWidgetManager(private val context: Context) {
    
    companion object {
        private const val TAG = "VoltraWidgetManager"
        private const val PREFS_NAME = "voltra_widgets"
        private const val KEY_JSON_PREFIX = "Voltra_Widget_JSON_"
        private const val KEY_DEEP_LINK_PREFIX = "Voltra_Widget_DeepLinkURL_"
    }
    
    private val prefs: SharedPreferences = 
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    
    /**
     * Write widget data to SharedPreferences
     * Uses commit() instead of apply() to ensure data is written before widget update
     */
    fun writeWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) {
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
     * Read widget JSON from SharedPreferences
     */
    fun readWidgetJson(widgetId: String): String? {
        val json = prefs.getString("$KEY_JSON_PREFIX$widgetId", null)
        Log.d(TAG, "readWidgetJson: widgetId=$widgetId, found=${json != null}, length=${json?.length ?: 0}")
        return json
    }
    
    /**
     * Read widget deep link URL from SharedPreferences
     */
    fun readDeepLinkUrl(widgetId: String): String? {
        return prefs.getString("$KEY_DEEP_LINK_PREFIX$widgetId", null)
    }
    
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
        val widgetKeys = allKeys.filter { key: String -> 
            key.startsWith(KEY_JSON_PREFIX) || key.startsWith(KEY_DEEP_LINK_PREFIX)
        }
        
        val editor = prefs.edit()
        widgetKeys.forEach { key: String -> editor.remove(key) }
        editor.commit()
        
        Log.d(TAG, "Cleared ${widgetKeys.size} widget keys")
    }
    
    /**
     * Update a specific widget using Glance's native update mechanism.
     * This properly triggers provideGlance() to re-run with fresh data.
     * 
     * Uses AppWidgetManager to get widget IDs, then converts them to GlanceIds
     * and calls update() on the GlanceAppWidget for each one.
     */
    suspend fun updateWidget(widgetId: String) = withContext(Dispatchers.IO) {
        Log.d(TAG, "updateWidget: widgetId=$widgetId")
        
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
    suspend fun reloadWidgets(widgetIds: List<String>?) = withContext(Dispatchers.Main) {
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
    suspend fun reloadAllWidgets() = withContext(Dispatchers.Main) {
        Log.d(TAG, "reloadAllWidgets")
        
        // Get all widget IDs from saved data
        val allKeys = prefs.all.keys
        val widgetIds = allKeys
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
