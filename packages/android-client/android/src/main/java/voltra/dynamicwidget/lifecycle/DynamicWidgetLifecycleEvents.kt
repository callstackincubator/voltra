package voltra.dynamicwidget.lifecycle

import android.os.Bundle
import android.util.Log
import org.json.JSONObject
import voltra.dynamicwidget.WidgetPlacementSize
import voltra.events.VoltraEvent

/**
 * The Dynamic Widget lifecycle events, run from the base Dynamic receiver after its own
 * cleanup. Every entry point logs failures and never throws: a broadcast receiver that throws
 * crashes the app.
 */
internal object DynamicWidgetLifecycleEvents {
    private const val TAG = "DynamicWidgetLifecycle"
    private const val SOURCE = "widget"

    /**
     * `widgetAdded` for each id the registry does not hold for [widgetType], which is then recorded
     * with its size. Seeds an unseeded registry first, so pre-existing placements stay silent.
     */
    fun onPlacementsSeen(
        widgetType: String,
        appWidgetIds: IntArray,
        sizeOf: (Int) -> WidgetPlacementSize,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        try {
            registry.seedIfNeeded()
        } catch (e: Exception) {
            Log.e(TAG, "Could not seed the placement registry", e)
            return
        }
        appWidgetIds.forEach { appWidgetId ->
            val added =
                try {
                    val size = sizeOf(appWidgetId)
                    size.takeIf { registry.addIfAbsent(widgetType, appWidgetId, it) }
                } catch (e: Exception) {
                    Log.e(TAG, "Could not record placement '$widgetType' ($appWidgetId)", e)
                    null
                } ?: return@forEach

            record("widgetAdded", widgetType, appWidgetId, recordEvent) { added.writeTo(this) }
        }
    }

    /**
     * `widgetAdded` for an unknown id, as [onPlacementsSeen]. For a known id, `widgetResized` when
     * [newOptions] carry a size that differs from the recorded one, which it then replaces.
     */
    fun onOptionsChanged(
        widgetType: String,
        appWidgetId: Int,
        newOptions: Bundle,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        val (size, recorded) =
            try {
                registry.seedIfNeeded()
                WidgetPlacementSize.fromOptions(newOptions) to registry.sizeOf(widgetType, appWidgetId)
            } catch (e: Exception) {
                Log.e(TAG, "Could not read placement '$widgetType' ($appWidgetId)", e)
                return
            }
        if (recorded == null) {
            onPlacementsSeen(widgetType, intArrayOf(appWidgetId), { size }, registry, recordEvent)
            return
        }
        if (!WidgetPlacementSize.hasSizeOptions(newOptions) || size.isSameSizeAs(recorded)) return

        try {
            registry.record(widgetType, appWidgetId, size)
        } catch (e: Exception) {
            Log.e(TAG, "Could not record the size of placement '$widgetType' ($appWidgetId)", e)
            return
        }
        record("widgetResized", widgetType, appWidgetId, recordEvent) { size.writeTo(this) }
    }

    /**
     * Forgets the removed placements, then emits one `widgetRemoved` per id, in array order,
     * whether or not Voltra knew the id.
     */
    fun onDeleted(
        widgetType: String,
        appWidgetIds: IntArray,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        try {
            registry.seedIfNeeded()
            registry.remove(widgetType, appWidgetIds)
        } catch (e: Exception) {
            Log.e(TAG, "Could not remove placements of '$widgetType' from the registry", e)
        }
        appWidgetIds.forEach { record("widgetRemoved", widgetType, it, recordEvent) }
    }

    /**
     * `widgetRestored` per (old, new) pair whose old id the registry knew, after moving its entry.
     * An unknown old id is left for the following `onUpdate` to report as `widgetAdded`.
     */
    fun onRestored(
        widgetType: String,
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        if (oldWidgetIds.size != newWidgetIds.size) return
        val moved =
            try {
                registry.seedIfNeeded()
                registry.move(widgetType, oldWidgetIds.zip(newWidgetIds))
            } catch (e: Exception) {
                Log.e(TAG, "Could not move placements of '$widgetType' in the registry", e)
                return
            }
        moved.forEach { (from, to) ->
            record("widgetRestored", widgetType, to, recordEvent) { put("previousAppWidgetId", from) }
        }
    }

    fun onEnabled(
        widgetType: String,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        val hasPlacements =
            try {
                registry.seedIfNeeded()
                registry.hasPlacements(widgetType)
            } catch (e: Exception) {
                Log.e(TAG, "Could not read placements of '$widgetType' from the registry", e)
                return
            }
        if (!hasPlacements) record("widgetEnabled", widgetType, recordEvent)
    }

    fun onDisabled(
        widgetType: String,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        try {
            registry.seedIfNeeded()
            registry.clear(widgetType)
        } catch (e: Exception) {
            Log.e(TAG, "Could not clear placements of '$widgetType' from the registry", e)
        }
        record("widgetDisabled", widgetType, recordEvent)
    }

    private fun record(
        type: String,
        widgetType: String,
        appWidgetId: Int,
        recordEvent: (VoltraEvent) -> Unit,
        fields: JSONObject.() -> Unit = {},
    ) = record(type, widgetType, recordEvent) {
        put("appWidgetId", appWidgetId)
        fields()
    }

    private fun record(
        type: String,
        widgetType: String,
        recordEvent: (VoltraEvent) -> Unit,
        fields: JSONObject.() -> Unit = {},
    ) {
        try {
            recordEvent(
                VoltraEvent(
                    type = type,
                    source = SOURCE,
                    fields = JSONObject().put("widgetType", widgetType).apply(fields),
                ),
            )
        } catch (e: Exception) {
            Log.e(TAG, "Could not record $type for '$widgetType'", e)
        }
    }
}
