package voltra.events

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Per-type queue rules. Lifecycle events describe placements an app may reconcile on its next launch,
 * days later; any other type is kept the 15 minutes the iOS interaction queue uses (ADR 0011).
 *
 * Events with the same coalescing key replace each other, newest wins: only the latest size of a
 * placement matters to an app that was not listening.
 */
internal object VoltraEventRules {
    private const val DEFAULT_RETENTION_MS = 15 * 60 * 1000L
    private const val LIFECYCLE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000L

    private val lifecycleTypes =
        setOf("widgetAdded", "widgetResized", "widgetRemoved", "widgetRestored", "widgetEnabled", "widgetDisabled")

    fun retentionMs(type: String): Long = if (type in lifecycleTypes) LIFECYCLE_RETENTION_MS else DEFAULT_RETENTION_MS

    fun coalescingKey(event: JSONObject): String? =
        when (event.optString("type")) {
            "widgetResized" -> "widgetResized:${event.optString("widgetType")}:${event.optInt("appWidgetId")}"
            else -> null
        }
}

/**
 * The persisted FIFO behind [VoltraEventBus]: a JSON array whose order is the delivery order.
 * Widget receivers run in the app process, so a process-wide lock is enough; writes use `commit()`
 * because a receiver's process can be reclaimed as soon as `onReceive` returns.
 */
internal object VoltraEventQueue {
    private const val TAG = "VoltraEventQueue"
    private const val PREFERENCES_NAME = "voltra_event_queue_v1"
    private const val KEY_EVENTS = "events"
    private const val MAX_EVENTS = 200

    private val lock = Any()

    fun record(
        context: Context,
        event: VoltraEvent,
        now: Long = System.currentTimeMillis(),
    ) {
        synchronized(lock) {
            val json =
                JSONObject(event.fields.toString())
                    .put("type", event.type)
                    .put("source", event.source)
                    .put("timestamp", now)
            val key = VoltraEventRules.coalescingKey(json)
            val kept = read(context).filter { key == null || VoltraEventRules.coalescingKey(it) != key }
            write(context, bounded(kept + json, now))
        }
    }

    fun pop(
        context: Context,
        types: Set<String>,
        now: Long = System.currentTimeMillis(),
    ): JSONArray =
        synchronized(lock) {
            val (taken, kept) = bounded(read(context), now).partition { it.optString("type") in types }
            write(context, kept)
            JSONArray(taken)
        }

    fun restore(
        context: Context,
        events: JSONArray,
        now: Long = System.currentTimeMillis(),
    ) {
        synchronized(lock) {
            val queued = read(context)
            val newerKeys = queued.mapNotNullTo(mutableSetOf(), VoltraEventRules::coalescingKey)
            val restored =
                (0 until events.length())
                    .mapNotNull { events.optJSONObject(it)?.takeIf(::isEvent) }
                    .filter { VoltraEventRules.coalescingKey(it) !in newerKeys }
            write(context, bounded(restored + queued, now))
        }
    }

    private fun bounded(
        events: List<JSONObject>,
        now: Long,
    ): List<JSONObject> {
        val fresh =
            events.filter {
                now -
                    it.getLong(
                        "timestamp",
                    ) <= VoltraEventRules.retentionMs(it.getString("type"))
            }
        if (fresh.size <= MAX_EVENTS) return fresh
        Log.w(TAG, "Event queue over $MAX_EVENTS events; dropping the ${fresh.size - MAX_EVENTS} oldest")
        return fresh.takeLast(MAX_EVENTS)
    }

    private fun read(context: Context): List<JSONObject> {
        val raw = preferences(context).getString(KEY_EVENTS, null) ?: return emptyList()
        val array =
            try {
                JSONArray(raw)
            } catch (e: Exception) {
                Log.w(TAG, "Event queue is unreadable; starting empty: ${e.message}")
                return emptyList()
            }
        return (0 until array.length()).mapNotNull { index ->
            array.optJSONObject(index)?.takeIf(::isEvent) ?: run {
                Log.w(TAG, "Skipping unparsable event queue entry at $index")
                null
            }
        }
    }

    private fun isEvent(json: JSONObject): Boolean =
        json.optString("type").isNotEmpty() && json.opt("timestamp") is Number

    private fun write(
        context: Context,
        events: List<JSONObject>,
    ) {
        if (!preferences(context).edit().putString(KEY_EVENTS, JSONArray(events).toString()).commit()) {
            Log.w(TAG, "Failed to persist the event queue")
        }
    }

    private fun preferences(context: Context) =
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
}
