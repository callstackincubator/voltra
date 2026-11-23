package voltra.events

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * The persisted FIFO behind [VoltraEventBus]: a JSON array whose order is the delivery order.
 * Widget receivers run in the app process, so a process-wide lock is enough; writes use `commit()`
 * because a receiver's process can be reclaimed as soon as `onReceive` returns.
 *
 * Each entry carries the producer's policy under [KEY_POLICY]. It travels with the event to
 * JavaScript, which strips it before dispatch and hands it back untouched with `restoreEvents`, so a
 * restored event keeps the retention and coalescing key it was recorded with.
 */
internal object VoltraEventQueue {
    private const val TAG = "VoltraEventQueue"
    private const val PREFERENCES_NAME = "voltra_event_queue_v1"
    private const val KEY_EVENTS = "events"
    private const val MAX_EVENTS = 200

    private const val KEY_POLICY = "__queue"
    private const val KEY_RETENTION_MS = "retentionMs"
    private const val KEY_COALESCING_KEY = "coalescingKey"

    private val lock = Any()

    fun record(
        context: Context,
        event: VoltraEvent,
        now: Long = System.currentTimeMillis(),
    ) {
        synchronized(lock) {
            val policy = JSONObject().put(KEY_RETENTION_MS, event.retentionMs)
            event.coalescingKey?.let { policy.put(KEY_COALESCING_KEY, it) }
            val json =
                JSONObject(event.fields.toString())
                    .put("type", event.type)
                    .put("source", event.source)
                    .put("timestamp", now)
                    .put(KEY_POLICY, policy)
            val key = event.coalescingKey
            val kept = read(context).filter { key == null || coalescingKey(it) != key }
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
            val newerKeys = queued.mapNotNullTo(mutableSetOf(), ::coalescingKey)
            val restored =
                (0 until events.length())
                    .mapNotNull { events.optJSONObject(it)?.takeIf(::isEvent) }
                    .filter { coalescingKey(it) !in newerKeys }
            write(context, bounded(restored + queued, now))
        }
    }

    private fun coalescingKey(event: JSONObject): String? =
        event.optJSONObject(KEY_POLICY)?.optString(KEY_COALESCING_KEY)?.takeIf { it.isNotEmpty() }

    private fun retentionMs(event: JSONObject): Long = event.getJSONObject(KEY_POLICY).getLong(KEY_RETENTION_MS)

    private fun bounded(
        events: List<JSONObject>,
        now: Long,
    ): List<JSONObject> {
        val fresh = events.filter { now - it.getLong("timestamp") <= retentionMs(it) }
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
        json.optString("type").isNotEmpty() &&
            json.opt("timestamp") is Number &&
            json.optJSONObject(KEY_POLICY)?.opt(KEY_RETENTION_MS) is Number

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
