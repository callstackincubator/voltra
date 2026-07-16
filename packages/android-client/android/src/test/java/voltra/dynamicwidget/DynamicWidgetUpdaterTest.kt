package voltra.dynamicwidget

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetUpdaterTest {
    @Test
    fun persistsNestedDynamicWidgetPropsBeforeTriggeringTheDynamicWidgetRefresh() =
        runTest {
            val dynamicWidgetPropsStore =
                DynamicWidgetPropsStore(RuntimeEnvironment.getApplication())
            var dynamicWidgetPropsObservedAtRefresh: String? = null
            val dynamicWidgetUpdater =
                DynamicWidgetUpdater(
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
}
