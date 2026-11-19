package voltra.dynamicwidget

import android.content.ComponentName
import androidx.glance.GlanceId
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * A configuration write must advance the placement's configuration revision *before* updating it.
 *
 * `GlanceAppWidget.update` on a widget whose session is still alive only reloads Glance state and
 * recomposes; it never re-runs `provideGlance`. The configuration the composition reads is keyed on
 * [dynamicWidgetConfigurationRevisionKey], so without the bump the widget redraws the values it
 * captured when its session began and the write stays invisible until the session idles out — the
 * defect an emulator run caught on both configuration paths.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetConfigurationUpdateTest {
    private val receiverComponentName =
        ComponentName("com.example.app", "com.example.app.widget.VoltraWidget_weatherReceiver")

    @Test
    fun advancesTheConfigurationRevisionBeforeUpdatingTheOnePlacementThatChanged() =
        runTest {
            val boundary = RecordingConfigurationUpdateBoundary(intArrayOf(41, 42))

            DynamicWidgetGlanceUpdateCoordinator(boundary)
                .triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
                    dynamicWidgetAppWidgetId = 42,
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )

            assertEquals(
                listOf(
                    ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(TestGlanceId(42), 1L),
                    ConfigurationUpdateEvent.WidgetUpdated(TestGlanceId(42)),
                ),
                boundary.events,
            )
        }

    @Test
    fun leavesSiblingPlacementsAloneOnAnInstanceWrite() =
        runTest {
            val boundary = RecordingConfigurationUpdateBoundary(intArrayOf(41, 42, 43))

            DynamicWidgetGlanceUpdateCoordinator(boundary)
                .triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
                    dynamicWidgetAppWidgetId = 42,
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )

            assertEquals(listOf(42), boundary.convertedAppWidgetIds)
        }

    @Test
    fun advancesEveryPlacementsConfigurationRevisionBeforeUpdatingItOnAWidgetTypeWrite() =
        runTest {
            val boundary = RecordingConfigurationUpdateBoundary(intArrayOf(41, 42))

            val updated =
                DynamicWidgetGlanceUpdateCoordinator(boundary)
                    .triggerDynamicWidgetConfigurationGlanceUpdate(
                        dynamicWidgetReceiverComponentName = receiverComponentName,
                        dynamicWidgetId = "weather",
                        dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                    )

            assertEquals(2, updated)
            assertEquals(
                listOf(
                    ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(TestGlanceId(41), 1L),
                    ConfigurationUpdateEvent.WidgetUpdated(TestGlanceId(41)),
                    ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(TestGlanceId(42), 1L),
                    ConfigurationUpdateEvent.WidgetUpdated(TestGlanceId(42)),
                ),
                boundary.events,
            )
        }

    @Test
    fun advancesTheConfigurationRevisionAgainForEverySequentialWrite() =
        runTest {
            val boundary = RecordingConfigurationUpdateBoundary(intArrayOf(41))
            val coordinator = DynamicWidgetGlanceUpdateCoordinator(boundary)

            repeat(2) {
                coordinator.triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
                    dynamicWidgetAppWidgetId = 41,
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )
            }

            // A second write to the same value must still change the revision, or the composition
            // would not recompose and the write would be invisible.
            assertEquals(
                listOf(
                    ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(TestGlanceId(41), 1L),
                    ConfigurationUpdateEvent.WidgetUpdated(TestGlanceId(41)),
                    ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(TestGlanceId(41), 2L),
                    ConfigurationUpdateEvent.WidgetUpdated(TestGlanceId(41)),
                ),
                boundary.events,
            )
        }

    @Test
    fun doesNotTouchThePropsRevisionOnAConfigurationWrite() =
        runTest {
            val boundary = RecordingConfigurationUpdateBoundary(intArrayOf(41))

            DynamicWidgetGlanceUpdateCoordinator(boundary)
                .triggerDynamicWidgetConfigurationGlanceUpdate(
                    dynamicWidgetReceiverComponentName = receiverComponentName,
                    dynamicWidgetId = "weather",
                    dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("weather"),
                )

            // Configuration and props are separate revisions; bumping props here would discard a
            // pending props coalescing window for no reason.
            assertEquals(0, boundary.propsRevisionAdvances)
        }

    private data class TestGlanceId(
        val appWidgetId: Int,
    ) : GlanceId

    private sealed interface ConfigurationUpdateEvent {
        data class ConfigurationRevisionAdvanced(
            val glanceId: GlanceId,
            val revision: Long,
        ) : ConfigurationUpdateEvent

        data class WidgetUpdated(
            val glanceId: GlanceId,
        ) : ConfigurationUpdateEvent
    }

    private class RecordingConfigurationUpdateBoundary(
        private val appWidgetIds: IntArray,
    ) : DynamicWidgetGlanceUpdateBoundary {
        val events = mutableListOf<ConfigurationUpdateEvent>()
        val convertedAppWidgetIds = mutableListOf<Int>()
        var propsRevisionAdvances = 0
            private set

        private val configurationRevisions = mutableMapOf<GlanceId, Long>()

        override fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray =
            appWidgetIds

        override suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId {
            convertedAppWidgetIds += dynamicWidgetAppWidgetId
            return TestGlanceId(dynamicWidgetAppWidgetId)
        }

        override suspend fun advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId: GlanceId) {
            propsRevisionAdvances += 1
        }

        override suspend fun advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId: GlanceId) {
            val nextRevision = (configurationRevisions[dynamicWidgetGlanceId] ?: 0L) + 1L
            configurationRevisions[dynamicWidgetGlanceId] = nextRevision
            events +=
                ConfigurationUpdateEvent.ConfigurationRevisionAdvanced(dynamicWidgetGlanceId, nextRevision)
        }

        override suspend fun updateDynamicWidget(
            dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
            dynamicWidgetGlanceId: GlanceId,
        ) {
            events += ConfigurationUpdateEvent.WidgetUpdated(dynamicWidgetGlanceId)
        }
    }
}
