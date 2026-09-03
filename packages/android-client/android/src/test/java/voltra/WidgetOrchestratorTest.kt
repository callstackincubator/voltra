package voltra

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.widget.VoltraWidgetKind
import voltra.widget.payload.VoltraWidgetManager

/**
 * Covers the classification behaviour ADR 0000 asks for: every pinned widget is classified
 * through the resolver before [WidgetOrchestrator] decides how to reload it, rather than assuming
 * "pinned minus cached/server ids" is Dynamic. A pinned widget the resolver can't classify
 * (Unresolved, modeled here as a null classification) must be left alone by the Dynamic-only
 * paths, not swept in by subtraction.
 */
@RunWith(RobolectricTestRunner::class)
class WidgetOrchestratorTest {
    // WidgetOrchestrator hops onto Dispatchers.Main; give runTest a Main dispatcher tied to its
    // own scheduler so that hop resolves within the test instead of parking on a real Android
    // main looper Robolectric never pumps.
    @Before
    fun setMainDispatcher() {
        Dispatchers.setMain(UnconfinedTestDispatcher())
    }

    @After
    fun resetMainDispatcher() {
        Dispatchers.resetMain()
    }

    @Test
    fun reloadClientWidgetsOnlyTriggersWidgetsTheResolverClassifiesAsDynamic() =
        runTest {
            val dynamicWidgetUpdateCalls = mutableListOf<String>()
            val orchestrator =
                WidgetOrchestrator(
                    context = RuntimeEnvironment.getApplication(),
                    widgetKindClassifier = { widgetId ->
                        when (widgetId) {
                            "dynamic-widget" -> VoltraWidgetKind.Dynamic
                            "payload-widget" -> VoltraWidgetKind.Payload
                            else -> null // unresolved, e.g. a stale/uninstalled receiver class
                        }
                    },
                    pinnedWidgetIdsSource = {
                        setOf("dynamic-widget", "payload-widget", "unresolved-widget")
                    },
                    clientWidgetGlanceUpdateTrigger = { widgetId -> dynamicWidgetUpdateCalls += widgetId },
                )

            orchestrator.reloadClientWidgets()

            assertEquals(listOf("dynamic-widget"), dynamicWidgetUpdateCalls)
        }

    @Test
    fun reloadAllWidgetsClassifiesEveryPinnedWidgetInsteadOfAssumingDynamicByLeftoverSubtraction() =
        runTest {
            val application = RuntimeEnvironment.getApplication()
            val payloadWidgetManager = VoltraWidgetManager(application)
            // "cached-payload-widget" has cached payload data; "unresolved-widget" has neither
            // cached data nor a server URL and the resolver can't classify it. Before ADR 0000
            // this second case would have been swept into the Dynamic bucket "by subtraction"
            // (pinned minus cached/server ids) and had a Dynamic Widget update triggered for it.
            payloadWidgetManager.writeWidgetData(
                "cached-payload-widget",
                """{"variants":[{"width":1,"height":1}]}""",
                null,
            )
            val dynamicWidgetUpdateCalls = mutableListOf<String>()
            val orchestrator =
                WidgetOrchestrator(
                    context = application,
                    payloadWidgetManager = payloadWidgetManager,
                    widgetKindClassifier = { widgetId ->
                        when (widgetId) {
                            "dynamic-widget" -> VoltraWidgetKind.Dynamic
                            "cached-payload-widget" -> VoltraWidgetKind.Payload
                            else -> null
                        }
                    },
                    pinnedWidgetIdsSource = {
                        setOf("dynamic-widget", "cached-payload-widget", "unresolved-widget")
                    },
                    dynamicWidgetGlanceUpdateTrigger = { widgetId -> dynamicWidgetUpdateCalls += widgetId },
                )

            orchestrator.reloadAllWidgets()

            // Only the widget the classifier resolved to Dynamic is triggered as one - the
            // unresolved widget is left alone rather than being assumed Dynamic by subtraction,
            // and the cached payload widget goes through the ordinary payload cache-update path
            // (not asserted here; VoltraWidgetManagerTest and PayloadWidgetUpdaterTest cover it).
            assertEquals(listOf("dynamic-widget"), dynamicWidgetUpdateCalls)
        }

    @Test
    fun reloadAllWidgetsTreatsACachedIdTheResolverClassifiesAsDynamicAsDynamicAndPurgesTheStalePayload() =
        runTest {
            val application = RuntimeEnvironment.getApplication()
            val payloadWidgetManager = VoltraWidgetManager(application)
            // Simulates the hazard from the gap report: a Dynamic Widget id still has a stale
            // payload cached, e.g. written by an app version predating PR #261 or by the old
            // updateAndroidWidget misuse. It must never be pushed onto the widget.
            payloadWidgetManager.writeWidgetData(
                "stale-payload-dynamic-widget",
                """{"variants":[{"width":1,"height":1}]}""",
                null,
            )
            val dynamicWidgetUpdateCalls = mutableListOf<String>()
            val orchestrator =
                WidgetOrchestrator(
                    context = application,
                    payloadWidgetManager = payloadWidgetManager,
                    widgetKindClassifier = { widgetId ->
                        when (widgetId) {
                            "stale-payload-dynamic-widget" -> VoltraWidgetKind.Dynamic
                            else -> null
                        }
                    },
                    pinnedWidgetIdsSource = { emptySet() },
                    dynamicWidgetGlanceUpdateTrigger = { widgetId -> dynamicWidgetUpdateCalls += widgetId },
                )

            orchestrator.reloadAllWidgets()

            // Reloaded through the Dynamic trigger, not the payload path...
            assertEquals(listOf("stale-payload-dynamic-widget"), dynamicWidgetUpdateCalls)
            // ...and the stale payload entry is cleared so it can't recur on a later reload.
            assertFalse("stale-payload-dynamic-widget" in payloadWidgetManager.cachedWidgetIds())
        }

    @Test
    fun reloadAllWidgetsTakesThePayloadPathForACachedIdTheResolverCannotClassify() =
        runTest {
            val application = RuntimeEnvironment.getApplication()
            val payloadWidgetManager = VoltraWidgetManager(application)
            payloadWidgetManager.writeWidgetData(
                "unresolved-cached-widget",
                """{"variants":[{"width":1,"height":1}]}""",
                null,
            )
            val dynamicWidgetUpdateCalls = mutableListOf<String>()
            val orchestrator =
                WidgetOrchestrator(
                    context = application,
                    payloadWidgetManager = payloadWidgetManager,
                    // The resolver can't classify this id (e.g. reflection/lookup failure), so it
                    // must keep the previous behaviour: the payload path, not a skip.
                    widgetKindClassifier = { null },
                    pinnedWidgetIdsSource = { emptySet() },
                    dynamicWidgetGlanceUpdateTrigger = { widgetId -> dynamicWidgetUpdateCalls += widgetId },
                )

            orchestrator.reloadAllWidgets()

            // Never treated as a Dynamic Widget...
            assertTrue(dynamicWidgetUpdateCalls.isEmpty())
            // ...and its cached payload is left in place (the payload path re-renders it, it is
            // not purged the way a confirmed-Dynamic id's stale entry is).
            assertTrue("unresolved-cached-widget" in payloadWidgetManager.cachedWidgetIds())
        }
}
