package voltra.events

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/** The queue's bounds (ADR 0014): the cap, per-type retention and corrupt entries. */
@RunWith(RobolectricTestRunner::class)
class VoltraEventQueueContractTest {
    private val application = RuntimeEnvironment.getApplication()
    private val now = 1_700_000_000_000L

    private fun removed(appWidgetId: Int) =
        VoltraEvent(
            "widgetRemoved",
            "widget",
            JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId),
        )

    private fun JSONArray.summary(): List<String> =
        (0 until length()).map { index ->
            val event = getJSONObject(index)
            "${event.getString("type")}:${event.optInt("appWidgetId", -1)}"
        }

    private fun resized(
        appWidgetId: Int,
        width: Int,
    ) = VoltraEvent(
        "widgetResized",
        "widget",
        JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId).put("width", width),
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
    fun aLifecycleEventOutlivesADefaultTypeEventOfTheSameAge() {
        VoltraEventQueue.record(application, removed(1), now)
        VoltraEventQueue.record(application, VoltraEvent("interaction", "widget"), now)
        val sixteenMinutesLater = now + 16 * 60 * 1000L

        assertEquals(
            listOf("widgetRemoved:1"),
            VoltraEventQueue.pop(application, setOf("widgetRemoved", "interaction"), sixteenMinutesLater).summary(),
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
        }
        val stored =
            JSONArray()
                .put(
                    valid(1),
                ).put("not an event")
                .put(JSONObject().put("type", "widgetRemoved"))
                .put(valid(2))
        application
            .getSharedPreferences("voltra_event_queue_v1", Context.MODE_PRIVATE)
            .edit()
            .putString("events", stored.toString())
            .commit()

        assertEquals(
            listOf("widgetRemoved:1", "widgetRemoved:2"),
            VoltraEventQueue.pop(application, setOf("widgetRemoved"), now).summary(),
        )
    }
}
