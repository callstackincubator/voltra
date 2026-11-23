package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import kotlinx.coroutines.runBlocking
import voltra.dynamicwidget.lifecycle.DynamicWidgetPlacementRegistry

/**
 * What a Dynamic Widget keeps per placement (`appWidgetId`) besides Glance's own state, and what
 * happens to it when the launcher deletes or restores a placement, or the app clears a widget.
 *
 * Every lifecycle callback makes one call here, so a store added later joins one list rather than
 * every callback. The id-list size check is done once, and each store is cleaned in its own
 * try/log: these run in a broadcast receiver, where a throw crashes the app, and one store's
 * failure must not skip the next. A missed cleanup is bounded, because every key carries the widget
 * id and a recycled `appWidgetId` can only surface data from a placement of the same widget.
 *
 * Stores today: the per-instance configuration (ADR 0006), the last good render (ADR 0013) and the
 * placement registry (ADR 0014). The stores know nothing about lifecycle events: the receiver
 * reports them from what these calls return.
 *
 * The configuration edit runs inside [runBlocking] rather than a launched coroutine, the pattern
 * `VoltraServerDrivenClientWidgetReceiver.onUpdate` already uses: `GlanceAppWidgetReceiver.onReceive`
 * has already consumed the broadcast's `goAsync()`, so a receiver cannot claim one, and a coroutine
 * launched without a keep-alive risks the process being reclaimed before the write lands.
 */
internal object DynamicWidgetPlacementData {
    private const val TAG = "DynamicWidgetPlacementData"

    /** Placements were removed from the home screen. */
    fun onDeleted(
        context: Context,
        widgetId: String,
        appWidgetIds: IntArray,
        // Injectable so a test does not leave the process-wide DataStore singleton running past the
        // Robolectric application that made it.
        configurationStore: VoltraConfigurationStore = VoltraConfigurationStore(context),
        lastGoodStore: DynamicWidgetLastGoodStore = DynamicWidgetLastGoodStore(context),
        registry: DynamicWidgetPlacementRegistry = DynamicWidgetPlacementRegistry(context),
    ) {
        val ids = appWidgetIds.toList()

        guarded("clear instance configuration", widgetId, ids) {
            runBlocking { configurationStore.clearInstances(widgetId, ids) }
        }
        guarded("clear the last good render", widgetId, ids) {
            lastGoodStore.delete(widgetId, ids)
        }
        guarded("remove the placements from the registry", widgetId, ids) {
            registry.remove(widgetId, appWidgetIds)
        }
    }

    /**
     * The launcher restored its layout and gave each placement a new id: move the data with it.
     * Returns the (old, new) pairs the registry knew and moved; empty if the move failed or the id
     * lists differ in length.
     */
    fun onRestored(
        context: Context,
        widgetId: String,
        oldAppWidgetIds: IntArray,
        newAppWidgetIds: IntArray,
        configurationStore: VoltraConfigurationStore = VoltraConfigurationStore(context),
        lastGoodStore: DynamicWidgetLastGoodStore = DynamicWidgetLastGoodStore(context),
        registry: DynamicWidgetPlacementRegistry = DynamicWidgetPlacementRegistry(context),
    ): List<Pair<Int, Int>> {
        if (oldAppWidgetIds.size != newAppWidgetIds.size) {
            Log.w(
                TAG,
                "onRestored for '$widgetId' passed ${oldAppWidgetIds.size} old ids and " +
                    "${newAppWidgetIds.size} new ids; skipping remap",
            )
            return emptyList()
        }
        val oldIds = oldAppWidgetIds.toList()
        val newIds = newAppWidgetIds.toList()

        guarded("remap instance configuration", widgetId, oldIds, newIds) {
            runBlocking { configurationStore.remapInstances(widgetId, oldIds, newIds) }
        }
        guarded("remap the last good render", widgetId, oldIds, newIds) {
            lastGoodStore.remap(widgetId, oldIds, newIds)
        }
        return guarded("move the placements in the registry", widgetId, oldIds, newIds) {
            registry.move(widgetId, oldIds.zip(newIds))
        } ?: emptyList()
    }

    /** The app cleared one widget's content (`clearAndroidWidget`). */
    fun onWidgetCleared(
        context: Context,
        widgetId: String,
        lastGoodStore: DynamicWidgetLastGoodStore = DynamicWidgetLastGoodStore(context),
    ) {
        // Cleared content must not come back through a later render failure (ADR 0013).
        guarded("clear the last good render", widgetId) { lastGoodStore.clear(widgetId) }
    }

    /** The app cleared every widget's content (`clearAllAndroidWidgets`). */
    fun onAllWidgetsCleared(
        context: Context,
        lastGoodStore: DynamicWidgetLastGoodStore = DynamicWidgetLastGoodStore(context),
    ) {
        guarded("clear the last good render", widgetId = null) { lastGoodStore.clearAll() }
    }

    private fun <T> guarded(
        what: String,
        widgetId: String?,
        vararg ids: List<Int>,
        block: () -> T,
    ): T? =
        try {
            block()
        } catch (e: Exception) {
            val placements = ids.joinToString(" -> ") { it.joinToString() }
            Log.w(
                TAG,
                "Could not $what for ${widgetId?.let { "widget '$it'" } ?: "all widgets"}" +
                    "${if (placements.isEmpty()) "" else " ($placements)"}: ${e.message}",
                e,
            )
            null
        }
}
