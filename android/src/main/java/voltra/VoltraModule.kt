package voltra

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking
import voltra.widget.VoltraWidgetManager

class VoltraModule : Module() {
    
    companion object {
        private const val TAG = "VoltraModule"
    }
    
    private val notificationManager by lazy { 
        VoltraNotificationManager(appContext.reactContext!!) 
    }
    
    private val widgetManager by lazy {
        VoltraWidgetManager(appContext.reactContext!!)
    }

    override fun definition() = ModuleDefinition {
        Name("VoltraModule")
        
        // Android Live Update APIs
        
        AsyncFunction("startAndroidLiveUpdate") { 
            payload: String, 
            options: Map<String, Any?> ->
            
            Log.d(TAG, "startAndroidLiveUpdate called")
            
            val updateName = options["updateName"] as? String
            val channelId = options["channelId"] as? String ?: "voltra_live_updates"
            
            Log.d(TAG, "updateName=$updateName, channelId=$channelId")
            
            val result = runBlocking {
                notificationManager.startLiveUpdate(payload, updateName, channelId)
            }
            
            Log.d(TAG, "startAndroidLiveUpdate returning: $result")
            result
        }
        
        AsyncFunction("updateAndroidLiveUpdate") { 
            notificationId: String, 
            payload: String ->
            
            Log.d(TAG, "updateAndroidLiveUpdate called with notificationId=$notificationId")
            
            runBlocking {
                notificationManager.updateLiveUpdate(notificationId, payload)
            }
            
            Log.d(TAG, "updateAndroidLiveUpdate completed")
        }
        
        AsyncFunction("stopAndroidLiveUpdate") { notificationId: String ->
            Log.d(TAG, "stopAndroidLiveUpdate called with notificationId=$notificationId")
            notificationManager.stopLiveUpdate(notificationId)
        }
        
        Function("isAndroidLiveUpdateActive") { updateName: String ->
            notificationManager.isLiveUpdateActive(updateName)
        }
        
        AsyncFunction("endAllAndroidLiveUpdates") {
            notificationManager.endAllLiveUpdates()
        }
        
        // Android Widget APIs
        
        AsyncFunction("updateAndroidWidget") {
            widgetId: String,
            jsonString: String,
            options: Map<String, Any?> ->
            
            Log.d(TAG, "updateAndroidWidget called with widgetId=$widgetId")
            
            val deepLinkUrl = options["deepLinkUrl"] as? String
            
            widgetManager.writeWidgetData(widgetId, jsonString, deepLinkUrl)
            
            runBlocking {
                widgetManager.updateWidget(widgetId)
            }
            
            Log.d(TAG, "updateAndroidWidget completed")
        }
        
        AsyncFunction("reloadAndroidWidgets") { widgetIds: ArrayList<String>? ->
            Log.d(TAG, "reloadAndroidWidgets called with widgetIds=$widgetIds")
            
            runBlocking {
                widgetManager.reloadWidgets(widgetIds)
            }
            
            Log.d(TAG, "reloadAndroidWidgets completed")
        }
        
        AsyncFunction("clearAndroidWidget") { widgetId: String ->
            Log.d(TAG, "clearAndroidWidget called with widgetId=$widgetId")
            
            widgetManager.clearWidgetData(widgetId)
            
            runBlocking {
                widgetManager.updateWidget(widgetId)
            }
            
            Log.d(TAG, "clearAndroidWidget completed")
        }
        
        AsyncFunction("clearAllAndroidWidgets") {
            Log.d(TAG, "clearAllAndroidWidgets called")
            
            widgetManager.clearAllWidgetData()
            
            runBlocking {
                widgetManager.reloadAllWidgets()
            }
            
            Log.d(TAG, "clearAllAndroidWidgets completed")
        }
    }
}
