package voltra.dynamicwidget

import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetBundleStateTest {
    @After
    fun clearRecord() {
        DynamicWidgetBundleRecord.clear()
    }

    private val failure =
        DynamicWidgetRenderOutcome.Failure(DynamicWidgetRenderOutcome.Stage.Bundle, "Metro is down", null)

    @Test
    fun aWidgetNothingHasLoadedReadsAsAFailedBundle() {
        val state = DynamicWidgetBundleRecord.get("never-loaded") as DynamicWidgetBundleState.Failed

        assertEquals(DynamicWidgetRenderOutcome.Stage.Bundle, state.failure.stage)
    }

    @Test
    fun aBundleThatCouldNotBeLoadedIsABundleStageFailure() {
        assertEquals(
            DynamicWidgetRenderOutcome.Failure(DynamicWidgetRenderOutcome.Stage.Bundle, "no asset", null),
            bundleFailure("no asset"),
        )
    }

    @Test
    fun aSuccessfulEvaluationIsReady() {
        var evaluated: Pair<String, String>? = null

        val state = evaluateBundleSource("source", "inbox") { source, id -> evaluated = source to id }

        assertEquals(DynamicWidgetBundleState.Ready, state)
        assertEquals("source" to "inbox", evaluated)
    }

    @Test
    fun aJavaScriptErrorDuringEvaluationIsAnEvaluateStageFailureWithItsStack() {
        val state =
            evaluateBundleSource("source", "inbox") { _, _ ->
                throw VoltraJSException("ReferenceError: x is not defined", "at <anonymous> (bundle.js:1:1)")
            }

        assertEquals(
            DynamicWidgetBundleState.Failed(
                DynamicWidgetRenderOutcome.Failure(
                    DynamicWidgetRenderOutcome.Stage.Evaluate,
                    "ReferenceError: x is not defined",
                    "at <anonymous> (bundle.js:1:1)",
                ),
            ),
            state,
        )
    }

    @Test
    fun recordsReadyAndFailedPerWidgetId() {
        DynamicWidgetBundleRecord.record("a", DynamicWidgetBundleState.Ready)
        DynamicWidgetBundleRecord.record("b", DynamicWidgetBundleState.Failed(failure))

        assertEquals(DynamicWidgetBundleState.Ready, DynamicWidgetBundleRecord.get("a"))
        assertEquals(DynamicWidgetBundleState.Failed(failure), DynamicWidgetBundleRecord.get("b"))
    }

    @Test
    fun aLaterWriteReplacesTheEarlierOneSoARetryCanRecover() {
        DynamicWidgetBundleRecord.record("a", DynamicWidgetBundleState.Failed(failure))
        DynamicWidgetBundleRecord.record("a", DynamicWidgetBundleState.Ready)

        assertEquals(DynamicWidgetBundleState.Ready, DynamicWidgetBundleRecord.get("a"))
    }

    @Test
    fun metroUnreachableNamesTheHostAndTheCause() {
        assertEquals(
            "Metro unreachable at 10.0.2.2:8081: Connection refused",
            metroUnreachableMessage("10.0.2.2:8081", "Connection refused"),
        )
    }

    @Test
    fun metroHttpFailureQuotesTheErrorFieldOfTheJsonBody() {
        assertEquals(
            "Metro HTTP 500 for http://h/x.bundle: Unable to resolve module ./nope",
            metroHttpFailureMessage(500, "http://h/x.bundle", """{"error":"Unable to resolve module ./nope"}"""),
        )
    }

    @Test
    fun metroHttpFailureTruncatesTheErrorFieldTo512Characters() {
        val message = metroHttpFailureMessage(500, "http://h/x", """{"error":"${"e".repeat(2_000)}"}""")

        assertEquals("Metro HTTP 500 for http://h/x: ".length + 512, message.length)
    }

    @Test
    fun metroHttpFailureOmitsABodyThatIsNotTheErrorShape() {
        assertEquals("Metro HTTP 404 for http://h/x", metroHttpFailureMessage(404, "http://h/x", "<html>nope</html>"))
        assertEquals("Metro HTTP 500 for http://h/x", metroHttpFailureMessage(500, "http://h/x", """{"other":1}"""))
        assertEquals("Metro HTTP 500 for http://h/x", metroHttpFailureMessage(500, "http://h/x", null))
    }

    @Test
    fun aMissingBakedBundleNamesTheAssetPath() {
        assertEquals(
            "Baked bundle is missing from the app's assets: assets/voltra/voltra-widget-inbox.bundle",
            missingBakedBundleMessage("assets/voltra/voltra-widget-inbox.bundle"),
        )
    }
}
