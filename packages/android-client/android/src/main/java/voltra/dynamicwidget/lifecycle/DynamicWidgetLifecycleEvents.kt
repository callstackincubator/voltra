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

    // Apps reconcile placements on their next launch, which may be days later.
    private const val RETENTION_MS = 7 * 24 * 60 * 60 * 1000L

    /**
     * `widgetAdded` for each id the registry does not hold for [widgetType], which is then recorded
     * with its size.
     */
    fun onPlacementsSeen(
        widgetType: String,
        appWidgetIds: IntArray,
        sizeOf: (Int) -> WidgetPlacementSize,
        registry: DynamicWidgetPlacementRegistry,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
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
        record(
            "widgetResized",
            widgetType,
            appWidgetId,
            recordEvent,
            coalescingKey = "widgetResized:$widgetType:$appWidgetId",
        ) { size.writeTo(this) }
    }

    /** One `widgetRemoved` per id, in array order, whether or not Voltra knew the id. */
    fun reportRemoved(
        widgetType: String,
        appWidgetIds: IntArray,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
        appWidgetIds.forEach { record("widgetRemoved", widgetType, it, recordEvent) }
    }

    /**
     * One `widgetRestored` per (old, new) pair the registry moved. An old id it did not know is left
     * for the following `onUpdate` to report as `widgetAdded`.
     */
    fun reportRestored(
        widgetType: String,
        moved: List<Pair<Int, Int>>,
        recordEvent: (VoltraEvent) -> Unit,
    ) {
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
        coalescingKey: String? = null,
        fields: JSONObject.() -> Unit = {},
    ) = record(type, widgetType, recordEvent, coalescingKey) {
        put("appWidgetId", appWidgetId)
        fields()
    }

    private fun record(
        type: String,
        widgetType: String,
        recordEvent: (VoltraEvent) -> Unit,
        coalescingKey: String? = null,
        fields: JSONObject.() -> Unit = {},
    ) {
        try {
            recordEvent(
                VoltraEvent(
                    type = type,
                    source = SOURCE,
                    fields = JSONObject().put("widgetType", widgetType).apply(fields),
                    retentionMs = RETENTION_MS,
                    coalescingKey = coalescingKey,
                ),
            )
        } catch (e: Exception) {
            Log.e(TAG, "Could not record $type for '$widgetType'", e)
        }
    }
}
