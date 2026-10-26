package voltra.dynamicwidget.lifecycle

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import voltra.dynamicwidget.WidgetPlacementSize
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetKindResolution
import voltra.widget.VoltraWidgetKindResolver
import voltra.widget.VoltraWidgetReceivers

internal data class DynamicWidgetPlacement(
    val widgetType: String,
    val appWidgetId: Int,
    val size: WidgetPlacementSize,
)

/**
 * The last recorded size of every Dynamic Widget placement Voltra knows, keyed by widget type and
 * `appWidgetId` (a launcher can recycle an id across widget types). Glance has no "added"
 * callback, so an id missing here is what makes a placement new.
 *
 * [currentPlacements] is what seeding records; injectable because Robolectric has no widget host.
 */
internal class DynamicWidgetPlacementRegistry(
    context: Context,
    private val currentPlacements: () -> List<DynamicWidgetPlacement> = { installedDynamicPlacements(context) },
) {
    // Lazy so that building a registry never throws: receivers build one before their cleanup,
    // and a storage failure must surface inside the lifecycle rules' own failure guards.
    private val preferences by lazy {
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Records every current placement, silently, the first time the registry is used (an upgrade
     * to a version with lifecycle events, or cleared app data). A placement made before this runs
     * is therefore never reported as added.
     */
    fun seedIfNeeded() {
        synchronized(lock) {
            if (preferences.getBoolean(KEY_SEEDED, false)) return
            val placements = currentPlacements()
            val editor = preferences.edit()
            placements.forEach { editor.putString(key(it.widgetType, it.appWidgetId), encode(it.size)) }
            editor.putBoolean(KEY_SEEDED, true).commit()
            Log.d(TAG, "Seeded placement registry with ${placements.size} placements")
        }
    }

    fun sizeOf(
        widgetType: String,
        appWidgetId: Int,
    ): WidgetPlacementSize? =
        synchronized(lock) {
            preferences.getString(key(widgetType, appWidgetId), null)?.let(::decode)
        }

    fun record(
        widgetType: String,
        appWidgetId: Int,
        size: WidgetPlacementSize,
    ) {
        synchronized(lock) {
            preferences.edit().putString(key(widgetType, appWidgetId), encode(size)).commit()
        }
    }

    fun addIfAbsent(
        widgetType: String,
        appWidgetId: Int,
        size: WidgetPlacementSize,
    ): Boolean =
        synchronized(lock) {
            val key = key(widgetType, appWidgetId)
            if (preferences.contains(key)) return false
            preferences.edit().putString(key, encode(size)).commit()
            true
        }

    fun remove(
        widgetType: String,
        appWidgetIds: IntArray,
    ) {
        synchronized(lock) {
            val editor = preferences.edit()
            appWidgetIds.forEach { editor.remove(key(widgetType, it)) }
            editor.commit()
        }
    }

    /**
     * Moves each (from, to) entry in one write, so ids that chain into each other (1 -> 2, 2 -> 3)
     * keep their own entries. Returns the pairs whose `from` was known.
     */
    fun move(
        widgetType: String,
        pairs: List<Pair<Int, Int>>,
    ): List<Pair<Int, Int>> =
        synchronized(lock) {
            val known =
                pairs.mapNotNull { pair ->
                    val value = preferences.getString(key(widgetType, pair.first), null)
                    value?.let { pair to it }
                }
            val editor = preferences.edit()
            known.forEach { (pair, _) -> editor.remove(key(widgetType, pair.first)) }
            known.forEach { (pair, value) -> editor.putString(key(widgetType, pair.second), value) }
            editor.commit()
            known.map { it.first }
        }

    fun hasPlacements(widgetType: String): Boolean =
        synchronized(lock) {
            preferences.all.keys.any { it.startsWith("$widgetType:") }
        }

    fun clear(widgetType: String) {
        synchronized(lock) {
            val editor = preferences.edit()
            preferences.all.keys
                .filter { it.startsWith("$widgetType:") }
                .forEach(editor::remove)
            editor.commit()
        }
    }

    companion object {
        private const val TAG = "VoltraPlacementRegistry"
        private const val PREFERENCES_NAME = "voltra_dynamic_widget_placements_v1"
        private const val KEY_SEEDED = "__seeded"

        private val lock = Any()

        private fun key(
            widgetType: String,
            appWidgetId: Int,
        ) = "$widgetType:$appWidgetId"

        private fun installedDynamicPlacements(context: Context): List<DynamicWidgetPlacement> {
            val manager = AppWidgetManager.getInstance(context)
            return VoltraWidgetReceivers
                .installedReceivers(context)
                .filter { (widgetType, _) ->
                    VoltraWidgetKindResolver.resolve(context, widgetType) ==
                        VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic)
                }.flatMap { (widgetType, component) ->
                    manager.getAppWidgetIds(component).map { appWidgetId ->
                        DynamicWidgetPlacement(
                            widgetType,
                            appWidgetId,
                            WidgetPlacementSize.fromOptions(manager.getAppWidgetOptions(appWidgetId)),
                        )
                    }
                }
        }

        private fun encode(size: WidgetPlacementSize): String = size.writeTo(JSONObject()).toString()

        private fun decode(raw: String): WidgetPlacementSize =
            try {
                val json = JSONObject(raw)
                val sizes = json.optJSONArray("sizes") ?: JSONArray()
                WidgetPlacementSize(
                    width = json.optInt("width"),
                    height = json.optInt("height"),
                    sizes =
                        (0 until sizes.length()).mapNotNull { index ->
                            sizes.optJSONObject(index)?.let {
                                WidgetPlacementSize.Dp(it.optDouble("width"), it.optDouble("height"))
                            }
                        },
                )
            } catch (e: Exception) {
                // Still a known placement: an unreadable size must not turn into a second widgetAdded.
                Log.w(TAG, "Unreadable placement entry; treating its size as unknown: ${e.message}")
                WidgetPlacementSize(0, 0, emptyList())
            }
    }
}
