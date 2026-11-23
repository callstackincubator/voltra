package voltra.events

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/** The queue's bounds (ADR 0014): the cap, producer-set retention and coalescing, and corrupt entries. */
@RunWith(RobolectricTestRunner::class)
class VoltraEventQueueContractTest {
    private val application = RuntimeEnvironment.getApplication()
    private val now = 1_700_000_000_000L
    private val hour = 60 * 60 * 1000L

    private fun removed(
        appWidgetId: Int,
        retentionMs: Long = hour,
    ) = VoltraEvent(
        "widgetRemoved",
        "widget",
        JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId),
        retentionMs = retentionMs,
    )

    private fun JSONArray.summary(): List<String> =
        (0 until length()).map { index ->
            val event = getJSONObject(index)
            "${event.getString("type")}:${event.optInt("appWidgetId", -1)}"
        }

    private fun resized(
        appWidgetId: Int,
        width: Int,
        retentionMs: Long = hour,
    ) = VoltraEvent(
        "widgetResized",
        "widget",
        JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId).put("width", width),
        retentionMs = retentionMs,
        coalescingKey = "resize:$appWidgetId",
    )

    private fun JSONArray.resizes(): List<String> =
        (0 until length()).map { index ->
            val event = getJSONObject(index)
            "${event.getString("type")}:${event.getInt("appWidgetId")}:${event.optInt("width", -1)}"
        }

    @Test
    fun recordingAResizeDropsTheQueuedResizeOfTheSamePlacementOnly() {
        VoltraEventQueue.record(application, resized(1, 100), now)
        VoltraEventQueue.record(application, removed(1), now)
        VoltraEventQueue.record(application, resized(2, 100), now)
        VoltraEventQueue.record(application, resized(1, 200), now)

        assertEquals(
            listOf("widgetRemoved:1:-1", "widgetResized:2:100", "widgetResized:1:200"),
            VoltraEventQueue.pop(application, setOf("widgetResized", "widgetRemoved"), now).resizes(),
        )
    }

    @Test
    fun aRestoredResizeGivesWayToANewerQueuedResizeOfTheSamePlacement() {
        VoltraEventQueue.record(application, resized(1, 100), now)
        VoltraEventQueue.record(application, resized(2, 100), now)
        val popped = VoltraEventQueue.pop(application, setOf("widgetResized"), now)
        VoltraEventQueue.record(application, resized(1, 300), now)

        VoltraEventQueue.restore(application, popped, now)

        assertEquals(
            listOf("widgetResized:2:100", "widgetResized:1:300"),
            VoltraEventQueue.pop(application, setOf("widgetResized"), now).resizes(),
        )
    }

    @Test
    fun the201stEventDropsTheOldest() {
        (1..201).forEach { VoltraEventQueue.record(application, removed(it), now) }

        val popped = VoltraEventQueue.pop(application, setOf("widgetRemoved"), now).summary()

        assertEquals(200, popped.size)
        assertEquals("widgetRemoved:2", popped.first())
        assertEquals("widgetRemoved:201", popped.last())
    }

    @Test
    fun eachEventIsKeptForTheRetentionItsProducerSet() {
        VoltraEventQueue.record(application, removed(1, retentionMs = hour), now)
        VoltraEventQueue.record(application, removed(2, retentionMs = 2 * hour), now)

        assertEquals(
            listOf("widgetRemoved:2"),
            VoltraEventQueue.pop(application, setOf("widgetRemoved"), now + 90 * 60 * 1000L).summary(),
        )
    }

    @Test
    fun anEventRestoredFromJavaScriptKeepsItsRetentionAndCoalescingKey() {
        val later = now + 2 * hour
        val roundTrip = { popped: JSONArray, at: Long ->
            VoltraEventQueue.restore(application, JSONArray(popped.toString()), at)
        }
        VoltraEventQueue.record(application, resized(1, 100, retentionMs = 3 * hour), now)
        VoltraEventQueue.record(application, removed(5, retentionMs = hour), now)
        roundTrip(VoltraEventQueue.pop(application, setOf("widgetResized", "widgetRemoved"), now), now)

        val stillQueued = VoltraEventQueue.pop(application, setOf("widgetResized", "widgetRemoved"), later)
        assertEquals(listOf("widgetResized:1:100"), stillQueued.resizes())

        roundTrip(stillQueued, later)
        VoltraEventQueue.record(application, resized(1, 200), later)
        assertEquals(
            listOf("widgetResized:1:200"),
            VoltraEventQueue.pop(application, setOf("widgetResized"), later).resizes(),
        )
    }

    @Test
    fun aCorruptQueuedEntryIsSkippedAndTheRestKept() {
        val valid = { id: Int ->
            JSONObject()
                .put("type", "widgetRemoved")
                .put("source", "widget")
                .put("timestamp", now)
                .put("widgetType", "weather")
                .put("appWidgetId", id)
                .put("__queue", JSONObject().put("retentionMs", hour))
        }
        val stored =
            JSONArray()
                .put(
                    valid(1),
                ).put("not an event")
                .put(JSONObject().put("type", "widgetRemoved"))
                .put(valid(3).apply { remove("__queue") })
                .put(valid(2))
        File(application.noBackupFilesDir, "voltra_event_queue_v1.json").writeText(stored.toString())

        assertEquals(
            listOf("widgetRemoved:1", "widgetRemoved:2"),
            VoltraEventQueue.pop(application, setOf("widgetRemoved"), now).summary(),
        )
    }
}
