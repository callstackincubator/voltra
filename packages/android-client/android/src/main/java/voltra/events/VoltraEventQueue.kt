package voltra.events

import android.content.Context
import android.util.AtomicFile
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileNotFoundException
import java.io.IOException

/**
 * The persisted FIFO behind [VoltraEventBus]: a JSON array whose order is the delivery order.
 * Widget receivers run in the app process, so a process-wide lock is enough; every write is synced
 * through [AtomicFile] because a receiver's process can be reclaimed as soon as `onReceive` returns.
 *
 * The file lives in `noBackupFilesDir` so queued events never follow a backup to another device.
 * Earlier versions kept the queue in the `voltra_event_queue_v1` SharedPreferences; its events are
 * moved to the front of the file on first access and the preferences are deleted.
 *
 * Each entry carries the producer's policy under [KEY_POLICY]. It travels with the event to
 * JavaScript, which strips it before dispatch and hands it back untouched with `restoreEvents`, so a
 * restored event keeps the retention and coalescing key it was recorded with.
 */
internal object VoltraEventQueue {
    private const val TAG = "VoltraEventQueue"
    private const val FILE_NAME = "voltra_event_queue_v1.json"
    private const val LEGACY_PREFERENCES_NAME = "voltra_event_queue_v1"
    private const val LEGACY_KEY_EVENTS = "events"
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
        val app = context.applicationContext
        val stored = parse(readFile(app))
        val legacy = app.getSharedPreferences(LEGACY_PREFERENCES_NAME, Context.MODE_PRIVATE)
        if (!legacy.contains(LEGACY_KEY_EVENTS)) return stored
        val merged = parse(legacy.getString(LEGACY_KEY_EVENTS, null)) + stored
        if (write(app, merged)) app.deleteSharedPreferences(LEGACY_PREFERENCES_NAME)
        return merged
    }

    private fun parse(raw: String?): List<JSONObject> {
        if (raw == null) return emptyList()
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

    private fun readFile(context: Context): String? =
        try {
            file(context).readFully().toString(Charsets.UTF_8)
        } catch (e: FileNotFoundException) {
            null
        } catch (e: IOException) {
            Log.w(TAG, "Event queue could not be read; starting empty: ${e.message}")
            null
        }

    private fun isEvent(json: JSONObject): Boolean =
        json.optString("type").isNotEmpty() &&
            json.opt("timestamp") is Number &&
            json.optJSONObject(KEY_POLICY)?.opt(KEY_RETENTION_MS) is Number

    private fun write(
        context: Context,
        events: List<JSONObject>,
    ): Boolean {
        val file = file(context)
        val stream =
            try {
                file.startWrite()
            } catch (e: IOException) {
                Log.w(TAG, "Failed to persist the event queue: ${e.message}")
                return false
            }
        return try {
            stream.write(JSONArray(events).toString().toByteArray(Charsets.UTF_8))
            file.finishWrite(stream)
            true
        } catch (e: IOException) {
            file.failWrite(stream)
            Log.w(TAG, "Failed to persist the event queue: ${e.message}")
            false
        }
    }

    private fun file(context: Context) = AtomicFile(File(context.applicationContext.noBackupFilesDir, FILE_NAME))
}
