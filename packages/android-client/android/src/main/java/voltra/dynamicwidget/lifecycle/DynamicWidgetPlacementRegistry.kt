package voltra.dynamicwidget.lifecycle

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.pm.PackageInfo
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
 * The first use of any method seeds the registry. After an upgrade (the package's install and update
 * times differ) it records every current placement silently, so a placement made before the upgrade
 * is never reported as added. On a fresh install it starts empty, so a widget placed before the app
 * first runs is still reported. A seeding failure is thrown from that method, like a storage failure.
 *
 * [dropUnbound] retires the entries whose id the system no longer has bound for an installed widget
 * type, such as entries restored from another device's backup. A retired entry no longer counts as
 * a known placement, but [move] still finds it, so a launcher restore whose old ids were retired
 * before its remap is still reported as restored.
 *
 * [boundPlacements] (every installed Dynamic widget type with its bound placements) is what seeding
 * records and pruning keeps, and [packageInfo] tells a fresh install from an upgrade; both are
 * injectable because Robolectric has no widget host or real install times.
 */
internal class DynamicWidgetPlacementRegistry(
    context: Context,
    private val boundPlacements: () -> Map<String, List<DynamicWidgetPlacement>> = {
        installedDynamicPlacements(context)
    },
    private val packageInfo: () -> PackageInfo = {
        context.packageManager.getPackageInfo(context.packageName, 0)
    },
) {
    // Lazy so that building a registry never throws: receivers build one before their cleanup,
    // and a storage or seeding failure must surface inside the callers' failure guards.
    private val preferences by lazy {
        context.applicationContext.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    }

    private fun <T> seeded(block: () -> T): T =
        synchronized(lock) {
            seedIfNeeded()
            block()
        }

    private fun seedIfNeeded() {
        if (preferences.getBoolean(KEY_SEEDED, false)) return
        if (isFreshInstall()) {
            preferences.edit().putBoolean(KEY_SEEDED, true).commit()
            Log.d(TAG, "Fresh install; placement registry starts empty")
            return
        }
        val placements = boundPlacements().values.flatten()
        val editor = preferences.edit()
        placements.forEach { editor.putString(key(it.widgetType, it.appWidgetId), encode(it.size)) }
        editor.putBoolean(KEY_SEEDED, true).commit()
        Log.d(TAG, "Seeded placement registry with ${placements.size} placements")
    }

    private fun isFreshInstall(): Boolean =
        try {
            packageInfo().let { it.firstInstallTime == it.lastUpdateTime }
        } catch (e: Exception) {
            Log.w(TAG, "Could not read the package's install times; seeding the placement registry", e)
            false
        }

    fun dropUnbound() {
        seeded {
            val bound = boundPlacements()
            val unbound =
                preferences.all.mapNotNull { (key, value) ->
                    if (key.startsWith(RESERVED_PREFIX) || value !is String) return@mapNotNull null
                    val boundIds = bound[key.substringBeforeLast(':')] ?: return@mapNotNull null
                    val appWidgetId = key.substringAfterLast(':').toIntOrNull()
                    (key to value).takeIf { boundIds.none { it.appWidgetId == appWidgetId } }
                }
            if (unbound.isEmpty()) return@seeded
            val editor = preferences.edit()
            unbound.forEach { (key, value) -> editor.remove(key).putString(RETIRED_PREFIX + key, value) }
            editor.commit()
            Log.d(TAG, "Dropped ${unbound.size} placements that are no longer bound")
        }
    }

    fun sizeOf(
        widgetType: String,
        appWidgetId: Int,
    ): WidgetPlacementSize? =
        seeded {
            preferences.getString(key(widgetType, appWidgetId), null)?.let(::decode)
        }

    fun record(
        widgetType: String,
        appWidgetId: Int,
        size: WidgetPlacementSize,
    ) {
        seeded {
            preferences.edit().putString(key(widgetType, appWidgetId), encode(size)).commit()
        }
    }

    fun addIfAbsent(
        widgetType: String,
        appWidgetId: Int,
        size: WidgetPlacementSize,
    ): Boolean =
        seeded {
            val key = key(widgetType, appWidgetId)
            if (preferences.contains(key)) {
                false
            } else {
                preferences.edit().putString(key, encode(size)).commit()
                true
            }
        }

    fun remove(
        widgetType: String,
        appWidgetIds: IntArray,
    ) {
        seeded {
            val editor = preferences.edit()
            appWidgetIds.forEach { editor.remove(key(widgetType, it)) }
            editor.commit()
        }
    }

    /**
     * Moves each (from, to) entry in one write, so ids that chain into each other (1 -> 2, 2 -> 3)
     * keep their own entries. Returns the pairs whose `from` was known or retired.
     */
    fun move(
        widgetType: String,
        pairs: List<Pair<Int, Int>>,
    ): List<Pair<Int, Int>> =
        seeded {
            val known =
                pairs.mapNotNull { pair ->
                    val from = key(widgetType, pair.first)
                    val value = preferences.getString(from, null) ?: preferences.getString(RETIRED_PREFIX + from, null)
                    value?.let { pair to it }
                }
            val editor = preferences.edit()
            known.forEach { (pair, _) ->
                val from = key(widgetType, pair.first)
                editor.remove(from).remove(RETIRED_PREFIX + from)
            }
            known.forEach { (pair, value) -> editor.putString(key(widgetType, pair.second), value) }
            editor.commit()
            known.map { it.first }
        }

    fun hasPlacements(widgetType: String): Boolean =
        seeded {
            preferences.all.keys.any { it.startsWith("$widgetType:") }
        }

    fun clear(widgetType: String) {
        seeded {
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
        private const val RESERVED_PREFIX = "__"
        private const val KEY_SEEDED = "${RESERVED_PREFIX}seeded"
        private const val RETIRED_PREFIX = "${RESERVED_PREFIX}retired:"

        private val lock = Any()

        private fun key(
            widgetType: String,
            appWidgetId: Int,
        ) = "$widgetType:$appWidgetId"

        private fun installedDynamicPlacements(context: Context): Map<String, List<DynamicWidgetPlacement>> {
            val manager = AppWidgetManager.getInstance(context)
            return VoltraWidgetReceivers
                .installedReceivers(context)
                .filterKeys { widgetType ->
                    VoltraWidgetKindResolver.resolve(context, widgetType) ==
                        VoltraWidgetKindResolution.Resolved(VoltraWidgetKind.Dynamic)
                }.mapValues { (widgetType, component) ->
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
