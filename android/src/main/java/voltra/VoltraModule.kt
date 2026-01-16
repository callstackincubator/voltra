package voltra

import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.runBlocking

class VoltraModule : Module() {
    
    companion object {
        private const val TAG = "VoltraModule"
    }
    
    private val notificationManager by lazy { 
        VoltraNotificationManager(appContext.reactContext!!) 
    }

    override fun definition() = ModuleDefinition {
        Name("VoltraModule")
        
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
    }
}
