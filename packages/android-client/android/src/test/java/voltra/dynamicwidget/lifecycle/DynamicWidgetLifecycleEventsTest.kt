package voltra.dynamicwidget.lifecycle

import android.appwidget.AppWidgetManager
import android.content.pm.PackageInfo
import android.os.Bundle
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.dynamicwidget.DynamicWidgetPlacementData
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

    private fun installedAt(
        firstInstallTime: Long,
        lastUpdateTime: Long,
    ) = PackageInfo().apply {
        this.firstInstallTime = firstInstallTime
        this.lastUpdateTime = lastUpdateTime
    }

    private val freshInstall = installedAt(1_000, 1_000)
    private val upgraded = installedAt(1_000, 2_000)

    private fun bound(vararg appWidgetIds: Int) =
        mapOf("weather" to appWidgetIds.map { DynamicWidgetPlacement("weather", it, size) })

    @Test
    fun afterAnUpgradeOnlyPlacementsMadeAfterSeedingAreReported() {
        var installed = bound(1)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded })

        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, record)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, record)
        installed = bound(1, 2)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1, 2), { size }, registry, record)

        assertEquals(listOf("widgetAdded:2"), recorded)
    }

    @Test
    fun onAFreshInstallTheFirstPlacementIsReportedAsEnabledThenAdded() {
        val installed = bound(1)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { freshInstall })

        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, record)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, record)

        assertEquals(listOf("widgetEnabled:-1", "widgetAdded:1"), recorded)
    }

    // Seeding with ids 1 and 2 stands in for a registry restored from another device's backup.
    @Test
    fun idsNoLongerBoundAreDroppedOnStartSoAReusedIdIsReportedAsAdded() {
        var installed = bound(1, 2)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded })
        DynamicWidgetPlacementData.onAppStarted(application, registry)

        installed = bound()
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        installed = bound(1)
        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, record)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, record)

        assertEquals(listOf("widgetEnabled:-1", "widgetAdded:1"), recorded)
    }

    @Test
    fun enablingAWidgetTypeWithOnlyUnboundEntriesReportsEnabled() {
        var installed = bound(1, 2)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded })
        DynamicWidgetPlacementData.onAppStarted(application, registry)

        installed = bound(7)
        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, record)

        assertEquals(listOf("widgetEnabled:-1"), recorded)
    }

    // The old ids of a launcher restore are no longer bound once the new ones are.
    @Test
    fun aLauncherRestoreAfterPruningStillReportsEveryKnownOldId() {
        var installed = bound(1, 2)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded })
        DynamicWidgetPlacementData.onAppStarted(application, registry)

        installed = bound(11, 12)
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, record)
        DynamicWidgetLifecycleEvents.reportRestored(
            "weather",
            registry.move("weather", listOf(1 to 11, 2 to 12)),
            record,
        )
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(11, 12), { size }, registry, record)

        assertEquals(listOf("widgetEnabled:-1", "widgetRestored:11", "widgetRestored:12"), recorded)
    }

    @Test
    fun disablingAWidgetTypeForgetsItsRetiredPlacements() {
        var installed = bound(1)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded })
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        installed = bound()
        DynamicWidgetPlacementData.onAppStarted(application, registry)

        DynamicWidgetLifecycleEvents.onDisabled("weather", registry, record)

        assertEquals(emptyList<Pair<Int, Int>>(), registry.move("weather", listOf(1 to 11)))
    }

    @Test
    fun aPlacementRetiredOver7DaysAgoIsForgottenWhileAYoungerOneIsStillRestored() {
        val day = 24 * 60 * 60 * 1000L
        var now = 1_700_000_000_000L
        val retiredFirst = now
        var installed = bound(1, 2)
        val registry = DynamicWidgetPlacementRegistry(application, { installed }, { upgraded }, { now })
        DynamicWidgetPlacementData.onAppStarted(application, registry)

        installed = bound(2)
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        now = retiredFirst + 2 * day
        installed = bound()
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        now = retiredFirst + 7 * day + 1
        DynamicWidgetPlacementData.onAppStarted(application, registry)
        DynamicWidgetLifecycleEvents.reportRestored(
            "weather",
            registry.move("weather", listOf(1 to 11, 2 to 12)),
            record,
        )

        assertEquals(listOf("widgetRestored:12"), recorded)
    }

    @Test
    fun aFailingRegistryIsNotThrownAndARemovalIsStillReported() {
        val failing =
            DynamicWidgetPlacementRegistry(application, { throw IllegalStateException("no widget host") }, { upgraded })

        DynamicWidgetPlacementData.onAppStarted(application, failing)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, failing, record)
        DynamicWidgetLifecycleEvents.onOptionsChanged("weather", 1, options, failing, record)
        DynamicWidgetLifecycleEvents.onEnabled("weather", failing, record)
        DynamicWidgetLifecycleEvents.reportRemoved("weather", intArrayOf(1), record)
        DynamicWidgetLifecycleEvents.onDisabled("weather", failing, record)

        assertEquals(listOf("widgetRemoved:1", "widgetDisabled:-1"), recorded)
    }

    @Test
    fun lifecycleEventsAreKept7DaysAndAResizeCoalescesPerPlacement() {
        val events = mutableListOf<VoltraEvent>()
        val keep = { event: VoltraEvent -> events += event }
        val registry = DynamicWidgetPlacementRegistry(application, { emptyMap() }, { freshInstall })
        val larger =
            Bundle().apply {
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 220)
                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 40)
            }

        DynamicWidgetLifecycleEvents.onEnabled("weather", registry, keep)
        DynamicWidgetLifecycleEvents.onPlacementsSeen("weather", intArrayOf(1), { size }, registry, keep)
        DynamicWidgetLifecycleEvents.onOptionsChanged("weather", 1, larger, registry, keep)
        DynamicWidgetLifecycleEvents.reportRestored("weather", listOf(1 to 2), keep)
        DynamicWidgetLifecycleEvents.reportRemoved("weather", intArrayOf(2), keep)
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
