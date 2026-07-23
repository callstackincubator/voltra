package voltra.dynamicwidget

import androidx.glance.appwidget.AppWidgetId
import androidx.glance.appwidget.state.getAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetGlanceStateTest {
    @Test
    fun atomicallyAdvancesThePerInstanceRevisionAcrossConcurrentInvalidations() =
        runTest {
            val context = RuntimeEnvironment.getApplication()
            val glanceId = AppWidgetId(93_741)
            val boundary = AndroidDynamicWidgetGlanceUpdateBoundary(context)
            val initialRevision =
                getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId)[
                    dynamicWidgetPropsRevisionKey,
                ] ?: 0L

            coroutineScope {
                List(20) {
                    async { boundary.advanceDynamicWidgetPropsRevision(glanceId) }
                }.awaitAll()
            }

            val finalRevision =
                getAppWidgetState(context, PreferencesGlanceStateDefinition, glanceId)[
                    dynamicWidgetPropsRevisionKey,
                ]
            assertEquals(initialRevision + 20L, finalRevision)
        }
}
