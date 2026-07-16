package voltra.dynamicwidget

import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetPropsStoreTest {
    @Test
    fun clearsAllDynamicWidgetProps() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        dynamicWidgetPropsStore.setDynamicWidgetProps("clear-all-first-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.setDynamicWidgetProps("clear-all-second-dynamic-widget", """{"value":2}""")

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
        dynamicWidgetPropsStore.setDynamicWidgetProps("cleared-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.setDynamicWidgetProps("retained-dynamic-widget", """{"value":2}""")

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
        DynamicWidgetPropsStore(application).setDynamicWidgetProps(
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

        dynamicWidgetPropsStore.setDynamicWidgetProps("first-dynamic-widget", """{"value":1}""")
        dynamicWidgetPropsStore.setDynamicWidgetProps("second-dynamic-widget", """{"value":2}""")

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

        dynamicWidgetPropsStore.setDynamicWidgetProps(
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
}
