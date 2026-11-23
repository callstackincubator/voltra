package voltra.dynamicwidget.lifecycle

import android.appwidget.AppWidgetManager
import android.os.Bundle
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.dynamicwidget.WidgetPlacementSize
import voltra.events.VoltraEvent

/**
 * The lifecycle rules where a widget broadcast can't set up the case: which placements
 * already exist when seeding runs, and storage that fails.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetLifecycleEventsTest {
    private val application = RuntimeEnvironment.getApplication()
    private val recorded = mutableListOf<String>()
    private val record: (VoltraEvent) -> Unit = { recorded += "${it.type}:${it.fields.optInt("appWidgetId", -1)}" }

    private val options =
        Bundle().apply {
            putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110)
            putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 40)
        }
    private val size = WidgetPlacementSize.fromOptions(options)

    @Test
    fun onlyPlacementsMadeAfterSeedingAreReportedAsAdded() {
        var installed = listOf(DynamicWidgetPlacement("weather", 1, size))
        val registry = DynamicWidgetPlacementRegistry(application) { installed }

        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, record)
        installed = installed + DynamicWidgetPlacement("weather", 2, size)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1, 2), { size }, registry, record)

        assertEquals(listOf("widgetAdded:2"), recorded)
    }

    @Test
    fun aFailingRegistryIsNotThrownAndARemovalIsStillReported() {
        val failing = DynamicWidgetPlacementRegistry(application) { throw IllegalStateException("no widget host") }

        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, failing, record)
        DynamicWidgetLifecycleEvents.onOptionsChanged("weather", 1, options, failing, record)
        DynamicWidgetLifecycleEvents.onRestored("weather", intArrayOf(1), intArrayOf(2), failing, record)
        DynamicWidgetLifecycleEvents.onEnabled("weather", failing, record)
        DynamicWidgetLifecycleEvents.onDeleted("weather", intArrayOf(1), failing, record)
        DynamicWidgetLifecycleEvents.onDisabled("weather", failing, record)

        assertEquals(listOf("widgetRemoved:1", "widgetDisabled:-1"), recorded)
    }

    @Test
    fun lifecycleEventsAreKept7DaysAndAResizeCoalescesPerPlacement() {
        val events = mutableListOf<VoltraEvent>()
        val keep = { event: VoltraEvent -> events += event }
        val registry = DynamicWidgetPlacementRegistry(application) { emptyList() }
        val larger =
            Bundle().apply {
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 220)
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 40)
            }

        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, keep)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, keep)
        DynamicWidgetLifecycleEvents.onOptionsChanged("weather", 1, larger, registry, keep)
        DynamicWidgetLifecycleEvents.onRestored("weather", intArrayOf(1), intArrayOf(2), registry, keep)
        DynamicWidgetLifecycleEvents.onDeleted("weather", intArrayOf(2), registry, keep)
        DynamicWidgetLifecycleEvents.onDisabled("weather", registry, keep)

        val sevenDays = 7 * 24 * 60 * 60 * 1000L
        assertEquals(
            listOf(
                "widgetEnabled:$sevenDays:null",
                "widgetAdded:$sevenDays:null",
                "widgetResized:$sevenDays:widgetResized:weather:1",
                "widgetRestored:$sevenDays:null",
                "widgetRemoved:$sevenDays:null",
                "widgetDisabled:$sevenDays:null",
            ),
            events.map { "${it.type}:${it.retentionMs}:${it.coalescingKey}" },
        )
    }
}
