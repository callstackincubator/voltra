package voltra.dynamicwidget

import android.content.ComponentName
import androidx.glance.GlanceId
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import voltra.widget.payload.VoltraGlanceWidget

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetReceiverUpdateTest {
    @Test
    fun targetsEveryInstalledInstanceOfTheGeneratedDynamicWidgetReceiver() =
        runTest {
            val dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather")
            val dynamicWidgetGlanceUpdateBoundary =
                RecordingDynamicWidgetGlanceUpdateBoundary(intArrayOf(41, 42))

            DynamicWidgetGlanceUpdateCoordinator(dynamicWidgetGlanceUpdateBoundary)
                .triggerDynamicWidgetGlanceUpdate(
                    dynamicWidgetReceiverComponentName =
                        ComponentName(
                            "com.example.app",
                            "com.example.app.widget.VoltraWidget_weatherReceiver",
                        ),
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
                )

            assertEquals(
                ComponentName(
                    "com.example.app",
                    "com.example.app.widget.VoltraWidget_weatherReceiver",
                ),
                dynamicWidgetGlanceUpdateBoundary.requestedDynamicWidgetReceiverComponentName,
            )
            assertEquals(listOf(41, 42), dynamicWidgetGlanceUpdateBoundary.convertedDynamicWidgetAppWidgetIds)
            assertEquals(
                listOf(
                    DynamicWidgetUpdateEvent.RevisionAdvanced(DynamicWidgetTestGlanceId(41), 1L),
                    DynamicWidgetUpdateEvent.WidgetUpdated(
                        dynamicWidgetGlanceAppWidget,
                        DynamicWidgetTestGlanceId(41),
                    ),
                    DynamicWidgetUpdateEvent.RevisionAdvanced(DynamicWidgetTestGlanceId(42), 1L),
                    DynamicWidgetUpdateEvent.WidgetUpdated(
                        dynamicWidgetGlanceAppWidget,
                        DynamicWidgetTestGlanceId(42),
                    ),
                ),
                dynamicWidgetGlanceUpdateBoundary.events,
            )
        }

    @Test
    fun succeedsWithoutConversionsOrUpdatesWhenNoDynamicWidgetInstancesAreInstalled() =
        runTest {
            val dynamicWidgetGlanceUpdateBoundary =
                RecordingDynamicWidgetGlanceUpdateBoundary(intArrayOf())

            DynamicWidgetGlanceUpdateCoordinator(dynamicWidgetGlanceUpdateBoundary)
                .triggerDynamicWidgetGlanceUpdate(
                    dynamicWidgetReceiverComponentName =
                        ComponentName(
                            "com.example.app",
                            "com.example.app.widget.VoltraWidget_weatherReceiver",
                        ),
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )

            assertEquals(emptyList<Int>(), dynamicWidgetGlanceUpdateBoundary.convertedDynamicWidgetAppWidgetIds)
            assertEquals(emptyList<DynamicWidgetUpdateEvent>(), dynamicWidgetGlanceUpdateBoundary.events)
        }

    @Test
    fun advancesEachInstanceRevisionForEverySequentialUpdate() =
        runTest {
            val dynamicWidgetGlanceUpdateBoundary =
                RecordingDynamicWidgetGlanceUpdateBoundary(intArrayOf(41))
            val dynamicWidgetGlanceUpdateCoordinator =
                DynamicWidgetGlanceUpdateCoordinator(dynamicWidgetGlanceUpdateBoundary)
            val dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather")

            repeat(2) {
                dynamicWidgetGlanceUpdateCoordinator.triggerDynamicWidgetGlanceUpdate(
                    dynamicWidgetReceiverComponentName =
                        ComponentName(
                            "com.example.app",
                            "com.example.app.widget.VoltraWidget_weatherReceiver",
                        ),
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
                )
            }

            assertEquals(
                listOf(
                    DynamicWidgetUpdateEvent.RevisionAdvanced(DynamicWidgetTestGlanceId(41), 1L),
                    DynamicWidgetUpdateEvent.WidgetUpdated(
                        dynamicWidgetGlanceAppWidget,
                        DynamicWidgetTestGlanceId(41),
                    ),
                    DynamicWidgetUpdateEvent.RevisionAdvanced(DynamicWidgetTestGlanceId(41), 2L),
                    DynamicWidgetUpdateEvent.WidgetUpdated(
                        dynamicWidgetGlanceAppWidget,
                        DynamicWidgetTestGlanceId(41),
                    ),
                ),
                dynamicWidgetGlanceUpdateBoundary.events,
            )
        }

    @Test
    fun rejectsALegacyWidgetReceiverGlanceInstance() {
        val exception =
            assertThrows(IllegalArgumentException::class.java) {
                runTest {
                    DynamicWidgetGlanceUpdateCoordinator(
                        RecordingDynamicWidgetGlanceUpdateBoundary(intArrayOf(41)),
                    ).triggerDynamicWidgetGlanceUpdate(
                        dynamicWidgetReceiverComponentName =
                            ComponentName(
                                "com.example.app",
                                "com.example.app.widget.VoltraWidget_legacy-widgetReceiver",
                            ),
                        dynamicWidgetId = "legacy-widget",
                        dynamicWidgetGlanceAppWidget = VoltraGlanceWidget("legacy-widget"),
                    )
                }
            }

        assertEquals(
            "Receiver for dynamicWidgetId=legacy-widget is not a Dynamic Widget receiver",
            exception.message,
        )
    }

    @Test
    fun propagatesDynamicWidgetReceiverLookupFailures() {
        val lookupFailure = IllegalStateException("receiver lookup failed")

        val exception =
            assertThrows(IllegalStateException::class.java) {
                runTest {
                    DynamicWidgetGlanceUpdateCoordinator(
                        RecordingDynamicWidgetGlanceUpdateBoundary(
                            dynamicWidgetAppWidgetIds = intArrayOf(),
                            dynamicWidgetReceiverLookupFailure = lookupFailure,
                        ),
                    ).triggerDynamicWidgetGlanceUpdate(
                        dynamicWidgetReceiverComponentName =
                            ComponentName(
                                "com.example.app",
                                "com.example.app.widget.VoltraWidget_weatherReceiver",
                            ),
                        dynamicWidgetId = "weather",
                        dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                    )
                }
            }

        assertSame(lookupFailure, exception)
    }

    @Test
    fun propagatesDynamicWidgetGlanceIdConversionFailures() {
        val conversionFailure = IllegalStateException("Glance ID conversion failed")

        val exception =
            assertThrows(IllegalStateException::class.java) {
                runTest {
                    DynamicWidgetGlanceUpdateCoordinator(
                        RecordingDynamicWidgetGlanceUpdateBoundary(
                            dynamicWidgetAppWidgetIds = intArrayOf(41),
                            dynamicWidgetGlanceIdConversionFailure = conversionFailure,
                        ),
                    ).triggerDynamicWidgetGlanceUpdate(
                        dynamicWidgetReceiverComponentName =
                            ComponentName(
                                "com.example.app",
                                "com.example.app.widget.VoltraWidget_weatherReceiver",
                            ),
                        dynamicWidgetId = "weather",
                        dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                    )
                }
            }

        assertSame(conversionFailure, exception)
    }

    @Test
    fun propagatesDynamicWidgetUpdateFailures() {
        val updateFailure = IllegalStateException("Dynamic Widget update failed")

        val exception =
            assertThrows(IllegalStateException::class.java) {
                runTest {
                    DynamicWidgetGlanceUpdateCoordinator(
                        RecordingDynamicWidgetGlanceUpdateBoundary(
                            dynamicWidgetAppWidgetIds = intArrayOf(41),
                            dynamicWidgetUpdateFailure = updateFailure,
                        ),
                    ).triggerDynamicWidgetGlanceUpdate(
                        dynamicWidgetReceiverComponentName =
                            ComponentName(
                                "com.example.app",
                                "com.example.app.widget.VoltraWidget_weatherReceiver",
                            ),
                        dynamicWidgetId = "weather",
                        dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                    )
                }
            }

        assertSame(updateFailure, exception)
    }

    @Test
    fun propagatesRevisionAdvanceFailuresWithoutUpdatingTheWidgetInstance() {
        val revisionAdvanceFailure = IllegalStateException("Dynamic Widget state update failed")
        val dynamicWidgetGlanceUpdateBoundary =
            RecordingDynamicWidgetGlanceUpdateBoundary(
                dynamicWidgetAppWidgetIds = intArrayOf(41),
                dynamicWidgetRevisionAdvanceFailure = revisionAdvanceFailure,
            )

        val exception =
            assertThrows(IllegalStateException::class.java) {
                runTest {
                    DynamicWidgetGlanceUpdateCoordinator(dynamicWidgetGlanceUpdateBoundary)
                        .triggerDynamicWidgetGlanceUpdate(
                            dynamicWidgetReceiverComponentName =
                                ComponentName(
                                    "com.example.app",
                                    "com.example.app.widget.VoltraWidget_weatherReceiver",
                                ),
                            dynamicWidgetId = "weather",
                            dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                        )
                }
            }

        assertSame(revisionAdvanceFailure, exception)
        assertEquals(emptyList<DynamicWidgetUpdateEvent>(), dynamicWidgetGlanceUpdateBoundary.events)
    }

    private data class DynamicWidgetTestGlanceId(
        val appWidgetId: Int,
    ) : GlanceId

    private sealed interface DynamicWidgetUpdateEvent {
        data class RevisionAdvanced(
            val glanceId: GlanceId,
            val revision: Long,
        ) : DynamicWidgetUpdateEvent

        data class WidgetUpdated(
            val glanceAppWidget: VoltraClientGlanceWidget,
            val glanceId: GlanceId,
        ) : DynamicWidgetUpdateEvent
    }

    private class RecordingDynamicWidgetGlanceUpdateBoundary(
        private val dynamicWidgetAppWidgetIds: IntArray,
        private val dynamicWidgetReceiverLookupFailure: Exception? = null,
        private val dynamicWidgetGlanceIdConversionFailure: Exception? = null,
        private val dynamicWidgetRevisionAdvanceFailure: Exception? = null,
        private val dynamicWidgetUpdateFailure: Exception? = null,
    ) : DynamicWidgetGlanceUpdateBoundary {
        var requestedDynamicWidgetReceiverComponentName: ComponentName? = null
        val convertedDynamicWidgetAppWidgetIds = mutableListOf<Int>()
        val events = mutableListOf<DynamicWidgetUpdateEvent>()
        private val revisions = mutableMapOf<GlanceId, Long>()

        override fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray {
            requestedDynamicWidgetReceiverComponentName = dynamicWidgetReceiverComponentName
            dynamicWidgetReceiverLookupFailure?.let { throw it }
            return dynamicWidgetAppWidgetIds
        }

        override suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId {
            convertedDynamicWidgetAppWidgetIds += dynamicWidgetAppWidgetId
            dynamicWidgetGlanceIdConversionFailure?.let { throw it }
            return DynamicWidgetTestGlanceId(dynamicWidgetAppWidgetId)
        }

        override suspend fun advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId: GlanceId) {
            dynamicWidgetRevisionAdvanceFailure?.let { throw it }
            val nextRevision = (revisions[dynamicWidgetGlanceId] ?: 0L) + 1L
            revisions[dynamicWidgetGlanceId] = nextRevision
            events += DynamicWidgetUpdateEvent.RevisionAdvanced(dynamicWidgetGlanceId, nextRevision)
        }

        override suspend fun updateDynamicWidget(
            dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
            dynamicWidgetGlanceId: GlanceId,
        ) {
            dynamicWidgetUpdateFailure?.let { throw it }
            events +=
                DynamicWidgetUpdateEvent.WidgetUpdated(
                    dynamicWidgetGlanceAppWidget,
                    dynamicWidgetGlanceId,
                )
        }
    }
}
