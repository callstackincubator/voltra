package voltra.events

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * The channel contract JavaScript relies on (ADR 0011's pull design): what `popEvents`
 * returns after native code sends, and where `restoreEvents` puts events back.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraEventBusTest {
    private val application = RuntimeEnvironment.getApplication()

    private fun removed(appWidgetId: Int) =
        VoltraEvent(
            type = "widgetRemoved",
            source = "widget",
            fields = JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId),
        )

    private fun JSONArray.summary(): List<String> =
        (0 until length()).map { index ->
            val event = getJSONObject(index)
            "${event.getString("type")}:${event.optInt("appWidgetId", -1)}"
        }

    @Test
    fun popReturnsOnlyTheRequestedTypesOldestFirst() {
        VoltraEventBus.send(application, removed(1))
        VoltraEventBus.send(
            application,
            VoltraEvent("widgetDisabled", "widget", JSONObject().put("widgetType", "weather")),
        )
        VoltraEventBus.send(application, removed(2))

        assertEquals(
            listOf("widgetRemoved:1", "widgetRemoved:2"),
            VoltraEventBus.pop(application, setOf("widgetRemoved")).summary(),
        )
        assertEquals(
            listOf("widgetDisabled:-1"),
            VoltraEventBus.pop(application, setOf("widgetDisabled", "widgetRemoved")).summary(),
        )
    }

    @Test
    fun popsTheEnvelopeWithTypeSpecificFieldsAtTheTopLevel() {
        VoltraEventBus.send(application, removed(7))

        val event = VoltraEventBus.pop(application, setOf("widgetRemoved")).getJSONObject(0)

        assertEquals(
            setOf("type", "source", "timestamp", "widgetType", "appWidgetId"),
            event.keys().asSequence().toSet(),
        )
        assertEquals("widget", event.getString("source"))
        assertEquals("weather", event.getString("widgetType"))
        assertEquals(7, event.getInt("appWidgetId"))
    }

    @Test
    fun restorePutsEventsBackAtTheFrontInOrder() {
        VoltraEventBus.send(application, removed(1))
        VoltraEventBus.send(application, removed(2))
        val popped = VoltraEventBus.pop(application, setOf("widgetRemoved"))
        VoltraEventBus.send(application, removed(3))

        VoltraEventBus.restore(application, popped)

        assertEquals(
            listOf("widgetRemoved:1", "widgetRemoved:2", "widgetRemoved:3"),
            VoltraEventBus.pop(application, setOf("widgetRemoved")).summary(),
        )
    }

    @Test
    fun unsubscribingAnOldTokenLeavesANewerSubscriberSignalled() {
        var oldSignals = 0
        var newSignals = 0
        val oldToken = VoltraEventBus.subscribe { oldSignals++ }
        val newToken = VoltraEventBus.subscribe { newSignals++ }

        VoltraEventBus.unsubscribe(oldToken)
        VoltraEventBus.send(application, removed(1))
        VoltraEventBus.unsubscribe(newToken)

        assertEquals(0, oldSignals)
        assertEquals(1, newSignals)
    }
}
