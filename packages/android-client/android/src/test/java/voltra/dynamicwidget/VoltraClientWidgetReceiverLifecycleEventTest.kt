package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.os.Looper
import android.util.SizeF
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.Shadows.shadowOf
import voltra.events.VoltraEventBus

@RunWith(RobolectricTestRunner::class)
class VoltraClientWidgetReceiverLifecycleEventTest {
    private val application = RuntimeEnvironment.getApplication()

    private class TestClientWidgetReceiver(
        override val widgetId: String,
    ) : VoltraClientWidgetReceiver()

    private fun register(widgetId: String = "weather") {
        application.registerReceiver(
            TestClientWidgetReceiver(widgetId),
            IntentFilter().apply {
                addAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                addAction(AppWidgetManager.ACTION_APPWIDGET_OPTIONS_CHANGED)
                addAction(AppWidgetManager.ACTION_APPWIDGET_RESTORED)
                addAction(AppWidgetManager.ACTION_APPWIDGET_DELETED)
            },
        )
    }

    private fun send(intent: Intent) {
        application.sendBroadcast(intent)
        shadowOf(Looper.getMainLooper()).idle()
    }

    private fun update(vararg appWidgetIds: Int) =
        send(
            Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds),
        )

    private fun optionsChanged(
        appWidgetId: Int,
        options: Bundle,
    ) = send(
        Intent(AppWidgetManager.ACTION_APPWIDGET_OPTIONS_CHANGED)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_OPTIONS, options),
    )

    // The system follows every restore with an update for the new ids.
    private fun restored(
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
    ) = send(
        Intent(AppWidgetManager.ACTION_APPWIDGET_RESTORED)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_OLD_IDS, oldWidgetIds)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, newWidgetIds),
    )

    private fun deleted(appWidgetId: Int) =
        send(
            Intent(AppWidgetManager.ACTION_APPWIDGET_DELETED)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId),
        )

    private fun size(
        width: Int,
        height: Int,
    ) = Bundle().apply {
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, width)
        putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, height)
    }

    private fun launcherSizes(vararg sizes: SizeF) =
        size(250, 90).apply { putParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES, arrayListOf(*sizes)) }

    private fun popped(): List<String> {
        val events =
            VoltraEventBus.pop(application, setOf("widgetAdded", "widgetResized", "widgetRemoved", "widgetRestored"))
        return (0 until events.length()).map { index ->
            val event = events.getJSONObject(index)
            val previous = if (event.has("previousAppWidgetId")) "<-${event.getInt("previousAppWidgetId")}" else ""
            "${event.getString("type")}:${event.getString("widgetType")}:${event.getInt("appWidgetId")}$previous"
        }
    }

    @Test
    fun anIdSharedByTwoWidgetTypesIsAddedOnceForEach() {
        register("weather")
        register("calendar")

        update(5)
        update(5)

        assertEquals(listOf("widgetAdded:weather:5", "widgetAdded:calendar:5"), popped())
    }

    @Test
    fun anOptionsChangeThatChangesNoSizeIsNotAResize() {
        register()
        optionsChanged(7, size(110, 40))
        popped()

        optionsChanged(7, size(110, 40).apply { putInt(AppWidgetManager.OPTION_APPWIDGET_HOST_CATEGORY, 2) })
        optionsChanged(7, Bundle().apply { putInt(AppWidgetManager.OPTION_APPWIDGET_HOST_CATEGORY, 2) })

        assertEquals(emptyList<String>(), popped())
    }

    @Test
    fun aReorderedSizesListIsNotAResizeButAChangedOneIs() {
        val portrait = SizeF(250f, 110f)
        val landscape = SizeF(340f, 90f)
        register()
        optionsChanged(7, launcherSizes(portrait, landscape))
        popped()

        optionsChanged(7, launcherSizes(landscape, portrait))
        assertEquals(emptyList<String>(), popped())

        optionsChanged(7, launcherSizes(portrait))
        assertEquals(listOf("widgetResized:weather:7"), popped())
    }

    @Test
    fun aRemovalIsReportedAfterThePlacementsConfigurationIsGone() =
        runBlocking {
            val store = VoltraConfigurationStore(application)
            store.set("weather", "label", "type-label")
            store.setInstanceValues("weather", 1, mapOf("label" to "London"))
            val labelsSeen = mutableListOf<String?>()
            val token =
                VoltraEventBus.subscribe {
                    labelsSeen +=
                        runBlocking { store.get("weather", appWidgetId = 1)["label"] }
                }
            register()

            try {
                deleted(1)
            } finally {
                VoltraEventBus.unsubscribe(token)
            }

            assertEquals(listOf("type-label"), labelsSeen)
            assertEquals(listOf("widgetRemoved:weather:1"), popped())
        }

    @Test
    fun restoredPlacementsAreReportedAsRestoredNotAdded() {
        register()
        update(1, 2)
        popped()

        restored(intArrayOf(1, 2), intArrayOf(11, 12))

        assertEquals(listOf("widgetRestored:weather:11<-1", "widgetRestored:weather:12<-2"), popped())
    }

    @Test
    fun aRestoredIdVoltraNeverSawIsReportedAsAdded() {
        register()
        update(1)
        popped()

        restored(intArrayOf(1, 3), intArrayOf(11, 13))

        assertEquals(listOf("widgetRestored:weather:11<-1", "widgetAdded:weather:13"), popped())
    }

    // A restore's new ids can overlap its old ones.
    @Test
    fun restoredIdsThatChainIntoEachOtherAreAllReportedAsRestored() {
        register()
        update(1, 2)
        popped()

        restored(intArrayOf(1, 2), intArrayOf(2, 3))

        assertEquals(listOf("widgetRestored:weather:2<-1", "widgetRestored:weather:3<-2"), popped())
    }

    @Test
    fun aRestoreWithMismatchedIdListsReportsNoRestore() {
        register()
        update(1, 2)
        popped()

        restored(intArrayOf(1, 2), intArrayOf(11))

        assertEquals(listOf("widgetAdded:weather:11"), popped())
    }
}
