package voltra.dynamicwidget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.models.VoltraNode

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetRenderCoordinatorTest {
    @Test
    fun passesEmptyDynamicWidgetPropsToTheDynamicWidgetRuntimeWhenNoPropsWerePersisted() {
        val dynamicWidgetRuntimeBoundary =
            RecordingDynamicWidgetRuntimeBoundary(
                dynamicWidgetStandaloneNodeJson = """{"t":18,"c":"No props"}""",
            )
        val dynamicWidgetRenderCoordinator =
            DynamicWidgetRenderCoordinator(
                dynamicWidgetRuntimeBoundary = dynamicWidgetRuntimeBoundary,
            )
        val dynamicWidgetPropsJson =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
                .getDynamicWidgetProps("absent-props-dynamic-widget")

        val dynamicWidgetNode =
            dynamicWidgetRenderCoordinator.renderDynamicWidget(
                dynamicWidgetId = "absent-props-dynamic-widget",
                dynamicWidgetPropsJson = dynamicWidgetPropsJson,
                dynamicWidgetEnvironmentJson = """{"widgetFamily":"180x110"}""",
            )

        assertEquals("{}", dynamicWidgetRuntimeBoundary.renderedDynamicWidgetPropsJson)
        assertTrue(dynamicWidgetNode is VoltraNode.Element)
        val dynamicWidgetTextNode =
            (dynamicWidgetNode as VoltraNode.Element).element.c as VoltraNode.Text
        assertEquals(
            "No props",
            dynamicWidgetTextNode.text,
        )
    }

    @Test
    fun passesPersistedNestedDynamicWidgetPropsAndEnvironmentToTheDynamicWidgetRuntime() {
        val dynamicWidgetPropsStore =
            DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
        dynamicWidgetPropsStore.persistDynamicWidgetProps(
            dynamicWidgetId = "weather-dynamic-widget",
            dynamicWidgetPropsJson =
                """{"title":"Forecast","weather":{"temperatures":[18,21,19],"metadata":{"units":"celsius","severe":false}}}""",
        )
        val dynamicWidgetRuntimeBoundary =
            RecordingDynamicWidgetRuntimeBoundary(
                dynamicWidgetStandaloneNodeJson =
                    """{"t":9,"p":{"s":{"bg":"#000000"}},"c":[{"t":18,"c":"Forecast"}]}""",
            )
        val dynamicWidgetRenderCoordinator =
            DynamicWidgetRenderCoordinator(
                dynamicWidgetRuntimeBoundary = dynamicWidgetRuntimeBoundary,
            )
        val dynamicWidgetEnvironmentJson =
            """{"widgetFamily":"180x110","locale":"en-US","build":{"isDev":false}}"""
        val dynamicWidgetPropsJson =
            dynamicWidgetPropsStore.getDynamicWidgetProps("weather-dynamic-widget")

        val dynamicWidgetNode =
            dynamicWidgetRenderCoordinator.renderDynamicWidget(
                dynamicWidgetId = "weather-dynamic-widget",
                dynamicWidgetPropsJson = dynamicWidgetPropsJson,
                dynamicWidgetEnvironmentJson = dynamicWidgetEnvironmentJson,
            )

        assertEquals("weather-dynamic-widget", dynamicWidgetRuntimeBoundary.renderedDynamicWidgetId)
        assertEquals(
            """{"title":"Forecast","weather":{"temperatures":[18,21,19],"metadata":{"units":"celsius","severe":false}}}""",
            dynamicWidgetRuntimeBoundary.renderedDynamicWidgetPropsJson,
        )
        assertEquals(
            dynamicWidgetEnvironmentJson,
            dynamicWidgetRuntimeBoundary.renderedDynamicWidgetEnvironmentJson,
        )
        assertTrue(dynamicWidgetNode is VoltraNode.Element)
        val dynamicWidgetRootElement = (dynamicWidgetNode as VoltraNode.Element).element

        @Suppress("UNCHECKED_CAST")
        val dynamicWidgetRootStyle =
            dynamicWidgetRootElement.p?.get("style") as? Map<String, Any?>
        assertEquals("#000000", dynamicWidgetRootStyle?.get("backgroundColor"))
    }

    private class RecordingDynamicWidgetRuntimeBoundary(
        private val dynamicWidgetStandaloneNodeJson: String?,
    ) : DynamicWidgetRuntimeBoundary {
        var renderedDynamicWidgetId: String? = null
        var renderedDynamicWidgetPropsJson: String? = null
        var renderedDynamicWidgetEnvironmentJson: String? = null

        override fun renderDynamicWidget(
            dynamicWidgetId: String,
            dynamicWidgetPropsJson: String,
            dynamicWidgetEnvironmentJson: String,
        ): String? {
            renderedDynamicWidgetId = dynamicWidgetId
            renderedDynamicWidgetPropsJson = dynamicWidgetPropsJson
            renderedDynamicWidgetEnvironmentJson = dynamicWidgetEnvironmentJson
            return dynamicWidgetStandaloneNodeJson
        }
    }
}
