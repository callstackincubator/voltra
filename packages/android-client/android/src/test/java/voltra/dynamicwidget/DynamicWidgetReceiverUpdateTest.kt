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
import voltra.widget.VoltraClientGlanceWidget
import voltra.widget.VoltraGlanceWidget

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
                    packageName = "com.example.app",
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
            assertEquals(2, dynamicWidgetGlanceUpdateBoundary.updatedDynamicWidgetInstances.size)
            dynamicWidgetGlanceUpdateBoundary.updatedDynamicWidgetInstances.forEachIndexed { index, update ->
                assertSame(dynamicWidgetGlanceAppWidget, update.first)
                assertEquals(DynamicWidgetTestGlanceId(index + 41), update.second)
            }
        }

    @Test
    fun succeedsWithoutConversionsOrUpdatesWhenNoDynamicWidgetInstancesAreInstalled() =
        runTest {
            val dynamicWidgetGlanceUpdateBoundary =
                RecordingDynamicWidgetGlanceUpdateBoundary(intArrayOf())

            DynamicWidgetGlanceUpdateCoordinator(dynamicWidgetGlanceUpdateBoundary)
                .triggerDynamicWidgetGlanceUpdate(
                    packageName = "com.example.app",
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )

            assertEquals(emptyList<Int>(), dynamicWidgetGlanceUpdateBoundary.convertedDynamicWidgetAppWidgetIds)
            assertEquals(
                emptyList<Pair<VoltraClientGlanceWidget, GlanceId>>(),
                dynamicWidgetGlanceUpdateBoundary.updatedDynamicWidgetInstances,
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
                        packageName = "com.example.app",
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
                        packageName = "com.example.app",
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
                        packageName = "com.example.app",
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
                        packageName = "com.example.app",
                        dynamicWidgetId = "weather",
                        dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                    )
                }
            }

        assertSame(updateFailure, exception)
    }

    private data class DynamicWidgetTestGlanceId(
        val appWidgetId: Int,
    ) : GlanceId

    private class RecordingDynamicWidgetGlanceUpdateBoundary(
        private val dynamicWidgetAppWidgetIds: IntArray,
        private val dynamicWidgetReceiverLookupFailure: Exception? = null,
        private val dynamicWidgetGlanceIdConversionFailure: Exception? = null,
        private val dynamicWidgetUpdateFailure: Exception? = null,
    ) : DynamicWidgetGlanceUpdateBoundary {
        var requestedDynamicWidgetReceiverComponentName: ComponentName? = null
        val convertedDynamicWidgetAppWidgetIds = mutableListOf<Int>()
        val updatedDynamicWidgetInstances = mutableListOf<Pair<VoltraClientGlanceWidget, GlanceId>>()

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

        override suspend fun updateDynamicWidget(
            dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
            dynamicWidgetGlanceId: GlanceId,
        ) {
            dynamicWidgetUpdateFailure?.let { throw it }
            updatedDynamicWidgetInstances += dynamicWidgetGlanceAppWidget to dynamicWidgetGlanceId
        }
    }
}
