package voltra.dynamicwidget

import android.content.ComponentName
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.AppWidgetId
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.async
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetRetryTest {
    private fun coordinator(
        calls: MutableList<String>,
        gate: CompletableDeferred<Unit>? = null,
    ) = DynamicWidgetRetryCoordinator(
        reloadBundle = {
            calls += "reload:$it"
            gate?.await()
        },
        triggerUpdate = { id, tapped -> calls += "update:$id:${(tapped as AppWidgetId).appWidgetId}" },
    )

    @Test
    fun reloadsTheBundleThenUpdatesTheTappedPlacement() =
        runBlocking {
            val calls = mutableListOf<String>()

            val ran = coordinator(calls).retry("retry-order", AppWidgetId(7))

            assertTrue(ran)
            assertEquals(listOf("reload:retry-order", "update:retry-order:7"), calls)
        }

    @Test
    fun aTapDuringARetryOfTheSameWidgetIdDoesNothing() =
        runBlocking {
            val gate = CompletableDeferred<Unit>()
            val calls = mutableListOf<String>()
            val first =
                async(
                    start = CoroutineStart.UNDISPATCHED,
                ) { coordinator(calls, gate).retry("retry-concurrent", AppWidgetId(1)) }

            val second = coordinator(calls).retry("retry-concurrent", AppWidgetId(2))

            assertFalse(second)
            assertEquals(listOf("reload:retry-concurrent"), calls)

            gate.complete(Unit)
            assertTrue(first.await())
            assertEquals(listOf("reload:retry-concurrent", "update:retry-concurrent:1"), calls)
        }

    @Test
    fun aRetryOfAnotherWidgetIdIsNotBlockedByARunningOne() =
        runBlocking {
            val gate = CompletableDeferred<Unit>()
            val first =
                async(start = CoroutineStart.UNDISPATCHED) {
                    coordinator(mutableListOf(), gate).retry("retry-a", AppWidgetId(1))
                }

            val other = coordinator(mutableListOf()).retry("retry-b", AppWidgetId(2))

            assertTrue(other)
            gate.complete(Unit)
            first.await()
            Unit
        }

    @Test
    fun aFinishedRetryDoesNotBlockTheNextTap() =
        runBlocking {
            val coordinator = coordinator(mutableListOf())

            assertTrue(coordinator.retry("retry-twice", AppWidgetId(1)))
            assertTrue(coordinator.retry("retry-twice", AppWidgetId(1)))
        }

    @Test
    fun aFailingRetryStillReleasesTheWidgetId() =
        runBlocking {
            val failing =
                DynamicWidgetRetryCoordinator(
                    reloadBundle = { error("boom") },
                    triggerUpdate = { _, _ -> },
                )
            try {
                failing.retry("retry-fails", AppWidgetId(1))
            } catch (expected: IllegalStateException) {
                // The callback surfaces it; the point is the guard below.
            }

            assertTrue(coordinator(mutableListOf()).retry("retry-fails", AppWidgetId(1)))
        }

    private class RecordingBoundary : DynamicWidgetGlanceUpdateBoundary {
        val events = mutableListOf<String>()

        override fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray =
            error("retry must not enumerate placements")

        override suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId =
            error("retry already holds the GlanceId")

        override suspend fun advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId: GlanceId) =
            error("retry advances only the retry revision")

        override suspend fun advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId: GlanceId) =
            error("retry advances only the retry revision")

        override suspend fun advanceDynamicWidgetRetryRevision(dynamicWidgetGlanceId: GlanceId) {
            events += "advance:${(dynamicWidgetGlanceId as AppWidgetId).appWidgetId}"
        }

        override suspend fun updateDynamicWidget(
            dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
            dynamicWidgetGlanceId: GlanceId,
        ) {
            events += "update:${(dynamicWidgetGlanceId as AppWidgetId).appWidgetId}"
        }
    }

    @Test
    fun theUpdateAdvancesTheRetryRevisionOfTheTappedPlacementOnly() =
        runBlocking {
            val boundary = RecordingBoundary()

            DynamicWidgetGlanceUpdateCoordinator(boundary).triggerDynamicWidgetRetryGlanceUpdate(
                dynamicWidgetGlanceId = AppWidgetId(7),
                dynamicWidgetId = "retry-update",
                dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("retry-update"),
            )

            assertEquals(listOf("advance:7", "update:7"), boundary.events)
        }

    @Test
    fun aPayloadWidgetsGlanceInstanceIsRejected() =
        runBlocking {
            val boundary = RecordingBoundary()

            val rejected =
                try {
                    DynamicWidgetGlanceUpdateCoordinator(boundary).triggerDynamicWidgetRetryGlanceUpdate(
                        dynamicWidgetGlanceId = AppWidgetId(7),
                        dynamicWidgetId = "retry-update",
                        dynamicWidgetGlanceAppWidget =
                            object : GlanceAppWidget() {
                                override suspend fun provideGlance(
                                    context: Context,
                                    id: GlanceId,
                                ) = Unit
                            },
                    )
                    false
                } catch (expected: IllegalArgumentException) {
                    true
                }

            assertTrue(rejected)
            assertEquals(emptyList<String>(), boundary.events)
        }

    @Test
    fun theRetryActionNameIsPinned() {
        assertEquals(
            "voltra.dynamicwidget.DynamicWidgetRetryActionCallback",
            DynamicWidgetRetryActionCallback::class.java.name,
        )
    }
}
