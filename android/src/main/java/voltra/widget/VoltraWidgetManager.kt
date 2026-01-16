package voltra.widget

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.updateAll
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
     */
    fun writeWidgetData(widgetId: String, jsonString: String, deepLinkUrl: String?) {
        Log.d(TAG, "writeWidgetData: widgetId=$widgetId, deepLinkUrl=$deepLinkUrl")
        
        prefs.edit().apply {
            putString("$KEY_JSON_PREFIX$widgetId", jsonString)
            
            if (deepLinkUrl != null && deepLinkUrl.isNotEmpty()) {
                putString("$KEY_DEEP_LINK_PREFIX$widgetId", deepLinkUrl)
            } else {
                remove("$KEY_DEEP_LINK_PREFIX$widgetId")
            }
            
            apply()
        }
        
        Log.d(TAG, "Widget data written successfully")
    }
    
    /**
     * Read widget JSON from SharedPreferences
     */
    fun readWidgetJson(widgetId: String): String? {
        return prefs.getString("$KEY_JSON_PREFIX$widgetId", null)
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
        
        prefs.edit().apply {
            remove("$KEY_JSON_PREFIX$widgetId")
            remove("$KEY_DEEP_LINK_PREFIX$widgetId")
            apply()
        }
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
        
        prefs.edit().apply {
            widgetKeys.forEach { key: String -> remove(key) }
            apply()
        }
        
        Log.d(TAG, "Cleared ${widgetKeys.size} widget keys")
    }
    
    /**
     * Update a specific widget by triggering its provider
     */
    suspend fun updateWidget(widgetId: String) = withContext(Dispatchers.Default) {
        Log.d(TAG, "updateWidget: widgetId=$widgetId")
        
        try {
            // Update all instances of this widget type
            // The widget will read the latest data from SharedPreferences
            VoltraGlanceWidget().updateAll(context)
            
            Log.d(TAG, "Widget update triggered successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to update widget: ${e.message}", e)
            throw e
        }
    }
    
    /**
     * Reload specific widgets or all widgets
     */
    suspend fun reloadWidgets(widgetIds: List<String>?) = withContext(Dispatchers.Default) {
        if (widgetIds != null && widgetIds.isNotEmpty()) {
            Log.d(TAG, "reloadWidgets: specific widgets ${widgetIds.joinToString()}")
        } else {
            Log.d(TAG, "reloadWidgets: all widgets")
        }
        // For all cases, we update all instances since Glance doesn't have a way 
        // to target specific widget IDs by our custom widgetId
        VoltraGlanceWidget().updateAll(context)
    }
    
    /**
     * Reload all widgets
     */
    suspend fun reloadAllWidgets() = withContext(Dispatchers.Default) {
        Log.d(TAG, "reloadAllWidgets")
        VoltraGlanceWidget().updateAll(context)
    }
}
