package voltra.events

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * An event a producer hands to [VoltraEventBus.send]. [fields] are the type-specific keys, merged
 * into the top level of the event JavaScript receives; the queue adds `type`, `source` and
 * `timestamp`.
 */
class VoltraEvent(
    val type: String,
    val source: String,
    val fields: JSONObject = JSONObject(),
)

/** Told that an event was recorded. Carries no event data; the subscriber pops. */
fun interface VoltraEventsAvailableListener {
    fun onEventsAvailable()
}

/**
 * Native-to-JavaScript event channel, one per process (the Android counterpart of ADR 0011's pull
 * design). Every event is recorded in [VoltraEventQueue] whether or not JavaScript listens;
 * subscribers are only signalled, and JavaScript takes events with [pop].
 *
 * Each React Native instance subscribes with its own token, so an instance torn down after its
 * replacement subscribed (a reload) cannot remove the replacement's subscription.
 */
object VoltraEventBus {
    private const val TAG = "VoltraEventBus"

    private val listeners = ConcurrentHashMap<String, VoltraEventsAvailableListener>()

    /** Never throws. */
    fun send(
        context: Context,
        event: VoltraEvent,
    ) {
        try {
            VoltraEventQueue.record(context, event)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to record '${event.type}' event", e)
            return
        }

        listeners.values.toList().forEach { listener ->
            try {
                listener.onEventsAvailable()
            } catch (e: Exception) {
                Log.e(TAG, "Events-available listener failed", e)
            }
        }
    }

    fun subscribe(listener: VoltraEventsAvailableListener): String {
        val token = UUID.randomUUID().toString()
        listeners[token] = listener
        return token
    }

    fun unsubscribe(token: String) {
        listeners.remove(token)
    }

    fun pop(
        context: Context,
        types: Set<String>,
    ): JSONArray = VoltraEventQueue.pop(context, types)

    fun restore(
        context: Context,
        events: JSONArray,
    ) = VoltraEventQueue.restore(context, events)
}
