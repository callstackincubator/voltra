package voltra.dynamicwidget

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.widget.server.WidgetScope

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetPropsStoreTest {
    @Test
    fun clearsAllDynamicWidgetProps() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        dynamicWidgetPropsStore.persistDynamicWidgetProps("clear-all-first-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.persistDynamicWidgetProps("clear-all-second-dynamic-widget", """{"value":2}""")

        dynamicWidgetPropsStore.clearAllDynamicWidgetProps()

        assertEquals(
            "{}",
            dynamicWidgetPropsStore.getDynamicWidgetProps("clear-all-first-dynamic-widget"),
        )
        assertEquals(
            "{}",
            dynamicWidgetPropsStore.getDynamicWidgetProps("clear-all-second-dynamic-widget"),
        )
    }

    @Test
    fun clearsOneDynamicWidgetWithoutAffectingAnother() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        dynamicWidgetPropsStore.persistDynamicWidgetProps("cleared-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.persistDynamicWidgetProps("retained-dynamic-widget", """{"value":2}""")

        dynamicWidgetPropsStore.clearDynamicWidgetProps("cleared-dynamic-widget")

        assertEquals(
            "{}",
            dynamicWidgetPropsStore.getDynamicWidgetProps("cleared-dynamic-widget"),
        )
        assertEquals(
            Json.parseToJsonElement("""{"value":2}"""),
            Json.parseToJsonElement(
                dynamicWidgetPropsStore.getDynamicWidgetProps("retained-dynamic-widget"),
            ),
        )
    }

    @Test
    fun persistsDynamicWidgetPropsAcrossStoreInstances() {
        val application = RuntimeEnvironment.getApplication()
        DynamicWidgetPropsStore(application).persistDynamicWidgetProps(
            "persistent-dynamic-widget",
            """{"session":"survives"}""",
        )

        val recreatedDynamicWidgetPropsStore = DynamicWidgetPropsStore(application)

        assertEquals(
            Json.parseToJsonElement("""{"session":"survives"}"""),
            Json.parseToJsonElement(
                recreatedDynamicWidgetPropsStore.getDynamicWidgetProps("persistent-dynamic-widget"),
            ),
        )
    }

    @Test
    fun isolatesDynamicWidgetPropsByDynamicWidgetId() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())

        dynamicWidgetPropsStore.persistDynamicWidgetProps("first-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.persistDynamicWidgetProps("second-dynamic-widget", """{"value":2}""")

        assertEquals(
            Json.parseToJsonElement("""{"value":1}"""),
            Json.parseToJsonElement(
                dynamicWidgetPropsStore.getDynamicWidgetProps("first-dynamic-widget"),
            ),
        )
        assertEquals(
            Json.parseToJsonElement("""{"value":2}"""),
            Json.parseToJsonElement(
                dynamicWidgetPropsStore.getDynamicWidgetProps("second-dynamic-widget"),
            ),
        )
    }

    @Test
    fun returnsEmptyDynamicWidgetPropsWhenAbsent() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())

        assertEquals(
            "{}",
            dynamicWidgetPropsStore.getDynamicWidgetProps("absent-dynamic-widget"),
        )
    }

    @Test
    fun preservesNestedDynamicWidgetProps() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        val dynamicWidgetPropsJson =
            """
            {
              "title": "Forecast",
              "weather": {
                "temperatures": [18, 21, 19],
                "metadata": { "units": "celsius", "severe": false }
              }
            }
            """.trimIndent()

        dynamicWidgetPropsStore.persistDynamicWidgetProps(
            dynamicWidgetId = "weather-dynamic-widget",
            dynamicWidgetPropsJson = dynamicWidgetPropsJson,
        )

        assertEquals(
            Json.parseToJsonElement(dynamicWidgetPropsJson),
            Json.parseToJsonElement(
                dynamicWidgetPropsStore.getDynamicWidgetProps("weather-dynamic-widget"),
            ),
        )
    }

    // --- ADR 0007: instance slot + fallback -------------------------------------------------

    @Test
    fun `an instance scope with no fetch yet falls back to the widget slot`() {
        val store = DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        store.persistDynamicWidgetProps("weather", """{"city":"default"}""")

        val instanceScope = WidgetScope.Instance("weather", "london-key")

        assertEquals(
            Json.parseToJsonElement("""{"city":"default"}"""),
            Json.parseToJsonElement(store.getDynamicWidgetProps(instanceScope)),
        )
    }

    @Test
    fun `a committed instance fetch is read back for that instance and does not affect the widget slot`() {
        val store = DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        store.persistDynamicWidgetProps("weather", """{"city":"default"}""")

        val london = WidgetScope.Instance("weather", "london-key")
        val paris = WidgetScope.Instance("weather", "paris-key")
        store.persistInstanceDynamicWidgetProps(london, """{"city":"London"}""")

        assertEquals(
            Json.parseToJsonElement("""{"city":"London"}"""),
            Json.parseToJsonElement(store.getDynamicWidgetProps(london)),
        )
        // A sibling instance that has not fetched yet still falls back to the widget slot.
        assertEquals(
            Json.parseToJsonElement("""{"city":"default"}"""),
            Json.parseToJsonElement(store.getDynamicWidgetProps(paris)),
        )
        assertEquals(
            Json.parseToJsonElement("""{"city":"default"}"""),
            Json.parseToJsonElement(store.getDynamicWidgetProps("weather")),
        )
    }

    @Test
    fun `clearing a widget's props also clears every instance slot`() {
        val store = DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        val london = WidgetScope.Instance("weather", "london-key")
        store.persistDynamicWidgetProps("weather", """{"city":"default"}""")
        store.persistInstanceDynamicWidgetProps(london, """{"city":"London"}""")

        store.clearDynamicWidgetProps("weather")

        assertEquals("{}", store.getDynamicWidgetProps(london))
        assertEquals("{}", store.getDynamicWidgetProps("weather"))
        assertTrue(store.instanceKeys("weather").isEmpty())
    }

    @Test
    fun `instanceKeys indexes every instance a widget has committed into`() {
        val store = DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        store.persistInstanceDynamicWidgetProps(WidgetScope.Instance("weather", "london-key"), """{"a":1}""")
        store.persistInstanceDynamicWidgetProps(WidgetScope.Instance("weather", "paris-key"), """{"a":2}""")

        assertEquals(setOf("london-key", "paris-key"), store.instanceKeys("weather"))
    }
}
