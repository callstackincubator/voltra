package voltra.parsing

import android.util.Log
import com.google.gson.GsonBuilder
import voltra.models.*

object VoltraPayloadParser {
    private const val TAG = "VoltraPayloadParser"
    
    private val gson = GsonBuilder()
        .registerTypeAdapter(VoltraNode::class.java, VoltraNodeDeserializer())
        .create()
    
    fun parse(jsonString: String): VoltraPayload {
        Log.d(TAG, "Parsing payload, length=${jsonString.length}")
        // Log first 500 chars to see the structure
        Log.d(TAG, "Payload preview: ${jsonString.take(500)}")
        
        val result = gson.fromJson(jsonString, VoltraPayload::class.java)
        
        Log.d(TAG, "Parsed: collapsed=${result.collapsed != null}, expanded=${result.expanded != null}, variants=${result.variants?.keys}")
        
        return result
    }
}
