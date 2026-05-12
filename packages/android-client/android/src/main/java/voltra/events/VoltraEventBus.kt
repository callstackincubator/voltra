package voltra.events

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * A centralized event bus that manages Voltra events from widgets to the React Native app.
 *
 * Event delivery uses a dual-path approach:
 * - Persistent: Events are written to SharedPreferences (survives app death)
 * - Hot: Events are broadcast via LocalBroadcastManager (immediate delivery when app is running)
 *
 * This mirrors the iOS implementation using UserDefaults + NotificationCenter.
 */
class VoltraEventBus private constructor(
    private val context: Context,
) {
    companion object {
        private const val TAG = "VoltraEventBus"
        private const val PREFS_NAME = "voltra_event_queue"
        private const val KEY_EVENTS = "events"
        private const val ACTION_VOLTRA_EVENT = "voltra.event.interaction"

        @Volatile
        private var instance: VoltraEventBus? = null

        fun getInstance(context: Context): VoltraEventBus =
            instance ?: synchronized(this) {
                instance ?: VoltraEventBus(context.applicationContext).also { instance = it }
            }
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val lock = Any()

    /**
     * Send an event. Uses dual-path delivery:
     * 1. Persist to SharedPreferences (survives app death)
     * 2. Broadcast via Intent (hot delivery when app is running)
     */
    fun send(event: VoltraEvent) {
        Log.d(
            TAG,
            "Sending event: ${event.type}",
        )

        // 1. Persist to SharedPreferences
        persistEvent(event)

        // 2. Broadcast for hot delivery (best-effort)
        try {
            val intent =
                Intent(ACTION_VOLTRA_EVENT).apply {
                    // Explicitly set package to ensure broadcast is delivered to our receiver
                    // This is required for RECEIVER_NOT_EXPORTED on Android 13+
                    setPackage(context.packageName)
                    putExtra("eventType", event.type)
                    event.toMap().forEach { (key, value) ->
                        when (value) {
                            is String -> putExtra(key, value)
                            is Long -> putExtra(key, value)
                            is Int -> putExtra(key, value)
                            is Boolean -> putExtra(key, value)
                            is Double -> putExtra(key, value)
                            null -> putExtra(key, "")
                        }
                    }
                }
            context.sendBroadcast(intent)
            Log.d(TAG, "Broadcast sent for event: ${event.type}")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to broadcast event (app may not be running): ${e.message}")
        }
    }

    /**
     * Get all persisted events and clear the queue.
     * Called when the React Native app starts to replay missed events.
     */
    fun popAll(): List<VoltraEvent> {
        synchronized(lock) {
            val events = readPersistedEvents()
            if (events.isNotEmpty()) {
                prefs.edit().remove(KEY_EVENTS).apply()
                Log.d(TAG, "Popped ${events.size} persisted events")
            }
            return events
        }
    }

    /**
     * Get all persisted events without clearing the queue.
     */
    fun peekAll(): List<VoltraEvent> {
        synchronized(lock) {
            return readPersistedEvents()
        }
    }

    /**
     * Clear all persisted events.
     */
    fun clearAll() {
        synchronized(lock) {
            prefs.edit().remove(KEY_EVENTS).apply()
            Log.d(TAG, "Cleared all persisted events")
        }
    }

    private fun persistEvent(event: VoltraEvent) {
        synchronized(lock) {
            try {
                val events = readPersistedEvents().toMutableList()
                events.add(event)

                // Convert to JSON array
                val jsonArray = JSONArray()
                events.forEach { evt ->
                    val jsonObject = JSONObject(evt.toMap())
                    jsonArray.put(jsonObject)
                }

                prefs.edit().putString(KEY_EVENTS, jsonArray.toString()).apply()
                Log.d(TAG, "Persisted event: ${event.type}, total in queue: ${events.size}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to persist event: ${e.message}", e)
            }
        }
    }

    private fun readPersistedEvents(): List<VoltraEvent> {
        return try {
            val jsonString = prefs.getString(KEY_EVENTS, null) ?: return emptyList()
            val jsonArray = JSONArray(jsonString)

            val events = mutableListOf<VoltraEvent>()
            for (i in 0 until jsonArray.length()) {
                val jsonObject = jsonArray.getJSONObject(i)
                val map =
                    jsonObject.keys().asSequence().associateWith { key ->
                        jsonObject.get(key)
                    }

                VoltraEvent.fromMap(map)?.let { events.add(it) }
            }

            events
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read persisted events: ${e.message}", e)
            emptyList()
        }
    }

    /**
     * Register a listener for hot event delivery.
     * Returns a function to unregister the listener.
     */
    fun addListener(listener: (VoltraEvent) -> Unit): () -> Unit {
        val receiver =
            object : BroadcastReceiver() {
                override fun onReceive(
                    context: Context?,
                    intent: Intent?,
                ) {
                    if (intent == null) return

                    try {
                        val eventType = intent.getStringExtra("eventType") ?: return
                        val eventMap = mutableMapOf<String, Any?>()

                        intent.extras?.keySet()?.forEach { key ->
                            eventMap[key] = intent.extras?.get(key)
                        }

                        VoltraEvent.fromMap(eventMap)?.let { listener(it) }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error processing broadcast: ${e.message}", e)
                    }
                }
            }

        val filter = IntentFilter(ACTION_VOLTRA_EVENT)
        context.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)

        return {
            try {
                context.unregisterReceiver(receiver)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to unregister receiver: ${e.message}")
            }
        }
    }
}
