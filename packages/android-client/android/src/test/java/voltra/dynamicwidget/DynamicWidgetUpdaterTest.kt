package voltra.dynamicwidget

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetUpdaterTest {
    private val resolvesToDynamicWidget =
        DynamicWidgetKindResolver { VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic) }

    @Test
    fun persistsNestedDynamicWidgetPropsBeforeTriggeringTheDynamicWidgetRefresh() =
        runTest {
            val dynamicWidgetPropsStore =
                DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
            var dynamicWidgetPropsObservedAtRefresh: String? = null
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = resolvesToDynamicWidget,
                    dynamicWidgetPropsPersistence = dynamicWidgetPropsStore,
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger { dynamicWidgetId ->
                            dynamicWidgetPropsObservedAtRefresh =
                                dynamicWidgetPropsStore.getDynamicWidgetProps(dynamicWidgetId)
                        },
                )
            val dynamicWidgetPropsJson =
                """{"title":"Forecast","weather":{"temperatures":[18,21],"metadata":{"units":"celsius"}}}"""

            dynamicWidgetUpdater.updateDynamicWidget(
                dynamicWidgetId = "weather-dynamic-widget",
                dynamicWidgetPropsJson = dynamicWidgetPropsJson,
            )

            assertEquals(
                Json.parseToJsonElement(dynamicWidgetPropsJson),
                Json.parseToJsonElement(dynamicWidgetPropsObservedAtRefresh!!),
            )
        }

    @Test
    fun invalidDynamicWidgetPropsDoNotOverwriteTheLastValidPropsOrTriggerARefresh() =
        runTest {
            val dynamicWidgetPropsStore =
                DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
            val dynamicWidgetId = "validation-dynamic-widget"
            val lastValidDynamicWidgetPropsJson = """{"status":"valid"}"""
            dynamicWidgetPropsStore.persistDynamicWidgetProps(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetPropsJson = lastValidDynamicWidgetPropsJson,
            )
            var dynamicWidgetRefreshCount = 0
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = resolvesToDynamicWidget,
                    dynamicWidgetPropsPersistence = dynamicWidgetPropsStore,
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger {
                            dynamicWidgetRefreshCount += 1
                        },
                )

            listOf("not-json", """["not","an","object"]""").forEach { invalidDynamicWidgetPropsJson ->
                val dynamicWidgetUpdateFailure =
                    runCatching {
                        dynamicWidgetUpdater.updateDynamicWidget(
                            dynamicWidgetId = dynamicWidgetId,
                            dynamicWidgetPropsJson = invalidDynamicWidgetPropsJson,
                        )
                    }.exceptionOrNull()

                assertNotNull(dynamicWidgetUpdateFailure)
                assertEquals(
                    Json.parseToJsonElement(lastValidDynamicWidgetPropsJson),
                    Json.parseToJsonElement(
                        dynamicWidgetPropsStore.getDynamicWidgetProps(dynamicWidgetId),
                    ),
                )
                assertEquals(0, dynamicWidgetRefreshCount)
            }
        }

    @Test
    fun propagatesDynamicWidgetPropsPersistenceFailuresWithoutTriggeringARefresh() =
        runTest {
            val dynamicWidgetPersistenceFailure = IllegalStateException("Dynamic Widget storage failed")
            var dynamicWidgetRefreshTriggered = false
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = resolvesToDynamicWidget,
                    dynamicWidgetPropsPersistence =
                        DynamicWidgetPropsPersistence { _, _ ->
                            throw dynamicWidgetPersistenceFailure
                        },
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger {
                            dynamicWidgetRefreshTriggered = true
                        },
                )

            val dynamicWidgetUpdateFailure =
                runCatching {
                    dynamicWidgetUpdater.updateDynamicWidget(
                        dynamicWidgetId = "storage-failure-dynamic-widget",
                        dynamicWidgetPropsJson = "{}",
                    )
                }.exceptionOrNull()

            assertSame(dynamicWidgetPersistenceFailure, dynamicWidgetUpdateFailure)
            assertEquals(false, dynamicWidgetRefreshTriggered)
        }

    @Test
    fun propagatesDynamicWidgetRefreshFailuresAfterPersistingProps() =
        runTest {
            val dynamicWidgetPropsStore =
                DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
            val dynamicWidgetRefreshFailure = IllegalStateException("Dynamic Widget refresh failed")
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = resolvesToDynamicWidget,
                    dynamicWidgetPropsPersistence = dynamicWidgetPropsStore,
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger {
                            throw dynamicWidgetRefreshFailure
                        },
                )
            val dynamicWidgetPropsJson = """{"persisted":true}"""

            val dynamicWidgetUpdateFailure =
                runCatching {
                    dynamicWidgetUpdater.updateDynamicWidget(
                        dynamicWidgetId = "refresh-failure-dynamic-widget",
                        dynamicWidgetPropsJson = dynamicWidgetPropsJson,
                    )
                }.exceptionOrNull()

            assertSame(dynamicWidgetRefreshFailure, dynamicWidgetUpdateFailure)
            assertEquals(
                Json.parseToJsonElement(dynamicWidgetPropsJson),
                Json.parseToJsonElement(
                    dynamicWidgetPropsStore.getDynamicWidgetProps("refresh-failure-dynamic-widget"),
                ),
            )
        }

    @Test
    fun rejectsAPayloadDrivenWidgetBeforePersistingOrTriggeringARefresh() =
        runTest {
            var persisted = false
            var refreshTriggered = false
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = {
                        VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Payload)
                    },
                    dynamicWidgetPropsPersistence =
                        DynamicWidgetPropsPersistence { _, _ -> persisted = true },
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger { refreshTriggered = true },
                )

            val dynamicWidgetUpdateFailure =
                runCatching {
                    dynamicWidgetUpdater.updateDynamicWidget(
                        dynamicWidgetId = "payload-widget",
                        dynamicWidgetPropsJson = "{}",
                    )
                }.exceptionOrNull()

            assertTrue(dynamicWidgetUpdateFailure is DynamicWidgetUpdateRejection.KindMismatch)
            assertFalse(persisted)
            assertFalse(refreshTriggered)
        }

    @Test
    fun rejectsAnUnresolvedWidgetBeforePersistingOrTriggeringARefresh() =
        runTest {
            var persisted = false
            var refreshTriggered = false
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
                    dynamicWidgetKindResolver = {
                        VoltraWidgetKindResolution.Unresolved("no receiver registered")
                    },
                    dynamicWidgetPropsPersistence =
                        DynamicWidgetPropsPersistence { _, _ -> persisted = true },
                    dynamicWidgetUpdateTrigger =
                        DynamicWidgetUpdateTrigger { refreshTriggered = true },
                )

            val dynamicWidgetUpdateFailure =
                runCatching {
                    dynamicWidgetUpdater.updateDynamicWidget(
                        dynamicWidgetId = "unknown-widget",
                        dynamicWidgetPropsJson = "{}",
                    )
                }.exceptionOrNull()

            assertTrue(dynamicWidgetUpdateFailure is DynamicWidgetUpdateRejection.NotFound)
            assertFalse(persisted)
            assertFalse(refreshTriggered)
        }
}
