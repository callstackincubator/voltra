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

        val dynamicWidgetOutcome =
            dynamicWidgetRenderCoordinator.renderDynamicWidget(
                dynamicWidgetId = "absent-props-dynamic-widget",
                dynamicWidgetRenderInput =
                    DynamicWidgetRenderInput(
                        propsRevision = 0L,
                        propsJson = dynamicWidgetPropsJson,
                    ),
                dynamicWidgetEnvironmentJson = """{"widgetFamily":"180x110"}""",
            )

        assertEquals(
            DynamicWidgetRenderInput(propsRevision = 0L, propsJson = "{}"),
            dynamicWidgetRuntimeBoundary.renderedDynamicWidgetInput,
        )
        val dynamicWidgetNode = (dynamicWidgetOutcome as DynamicWidgetRenderOutcome.Success).node
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

        val dynamicWidgetOutcome =
            dynamicWidgetRenderCoordinator.renderDynamicWidget(
                dynamicWidgetId = "weather-dynamic-widget",
                dynamicWidgetRenderInput =
                    DynamicWidgetRenderInput(
                        propsRevision = 17L,
                        propsJson = dynamicWidgetPropsJson,
                    ),
                dynamicWidgetEnvironmentJson = dynamicWidgetEnvironmentJson,
            )

        assertEquals("weather-dynamic-widget", dynamicWidgetRuntimeBoundary.renderedDynamicWidgetId)
        assertEquals(
            """{"title":"Forecast","weather":{"temperatures":[18,21,19],"metadata":{"units":"celsius","severe":false}}}""",
            dynamicWidgetRuntimeBoundary.renderedDynamicWidgetInput?.propsJson,
        )
        assertEquals(17L, dynamicWidgetRuntimeBoundary.renderedDynamicWidgetInput?.propsRevision)
        assertEquals(
            dynamicWidgetEnvironmentJson,
            dynamicWidgetRuntimeBoundary.renderedDynamicWidgetEnvironmentJson,
        )
        val dynamicWidgetNode = (dynamicWidgetOutcome as DynamicWidgetRenderOutcome.Success).node
        assertTrue(dynamicWidgetNode is VoltraNode.Element)
        val dynamicWidgetRootElement = (dynamicWidgetNode as VoltraNode.Element).element

        @Suppress("UNCHECKED_CAST")
        val dynamicWidgetRootStyle =
            dynamicWidgetRootElement.p?.get("style") as? Map<String, Any?>
        assertEquals("#000000", dynamicWidgetRootStyle?.get("backgroundColor"))
    }

    @Test
    fun aSuccessfulRenderCarriesTheNodeJsonItParsed() {
        val json = """{"t":18,"c":"Hello"}"""

        val outcome = render(RecordingDynamicWidgetRuntimeBoundary(json))

        assertEquals(json, (outcome as DynamicWidgetRenderOutcome.Success).nodeJson)
    }

    @Test
    fun aJavaScriptThrowIsARenderFailureWithTheMessageAndStack() {
        val outcome =
            render(
                RecordingDynamicWidgetRuntimeBoundary(
                    failure = VoltraJSException("TypeError: x is undefined", "at Widget (a.tsx:1:2)"),
                ),
            )

        assertEquals(
            DynamicWidgetRenderOutcome.Failure(
                DynamicWidgetRenderOutcome.Stage.Render,
                "TypeError: x is undefined",
                "at Widget (a.tsx:1:2)",
            ),
            outcome,
        )
    }

    @Test
    fun unparseableNodeJsonIsAParseFailure() {
        val outcome = render(RecordingDynamicWidgetRuntimeBoundary("""{"t":"not a node"""))

        val failure = outcome as DynamicWidgetRenderOutcome.Failure
        assertEquals(DynamicWidgetRenderOutcome.Stage.Parse, failure.stage)
        assertTrue(failure.message.isNotBlank())
    }

    @Test
    fun theStageLabelsAreTheLowercaseNamesTheLogLineUses() {
        assertEquals(
            listOf("bundle", "evaluate", "render", "parse"),
            DynamicWidgetRenderOutcome.Stage.entries.map { it.label },
        )
    }

    private fun render(boundary: DynamicWidgetRuntimeBoundary): DynamicWidgetRenderOutcome =
        DynamicWidgetRenderCoordinator(boundary).renderDynamicWidget(
            dynamicWidgetId = "outcome-widget",
            dynamicWidgetRenderInput = DynamicWidgetRenderInput(propsRevision = 0L, propsJson = "{}"),
            dynamicWidgetEnvironmentJson = "{}",
        )

    private class RecordingDynamicWidgetRuntimeBoundary(
        private val dynamicWidgetStandaloneNodeJson: String = "",
        private val failure: VoltraJSException? = null,
    ) : DynamicWidgetRuntimeBoundary {
        var renderedDynamicWidgetId: String? = null
        var renderedDynamicWidgetInput: DynamicWidgetRenderInput? = null
        var renderedDynamicWidgetEnvironmentJson: String? = null

        override fun renderDynamicWidget(
            dynamicWidgetId: String,
            dynamicWidgetRenderInput: DynamicWidgetRenderInput,
            dynamicWidgetEnvironmentJson: String,
        ): String {
            renderedDynamicWidgetId = dynamicWidgetId
            renderedDynamicWidgetInput = dynamicWidgetRenderInput
            renderedDynamicWidgetEnvironmentJson = dynamicWidgetEnvironmentJson
            failure?.let { throw it }
            return dynamicWidgetStandaloneNodeJson
        }
    }
}
