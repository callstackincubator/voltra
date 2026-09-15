package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import androidx.annotation.VisibleForTesting
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import org.json.JSONObject
import java.io.IOException

/**
 * DataStore-backed per-widget configuration for Dynamic Widgets — the values surfaced as
 * `env.configuration` in the widget's `(props, env) => JSX` render.
 *
 * Three layers, merged at read time, each hiding the same key in the one below it (ADR 0006):
 *  - **Defaults** declared in code (`app.json` widget `appIntent.parameters[].default`), emitted by
 *    the config plugin to `assets/voltra/widget_config_defaults.json`. These are the values the
 *    widget shows before the user configures anything — the Android equivalent of iOS's
 *    `@Parameter(default:)`.
 *  - **Widget-type** values written at runtime (see `setWidgetConfiguration`). They apply to every
 *    placement of the widget that has no value of its own for the same key.
 *  - **Instance** values written at runtime (see `setWidgetInstanceConfiguration`) for one placed
 *    `appWidgetId`, so two placements of the same widget can show different things.
 *
 * Stands in for a real Glance configuration activity: Android has no system-managed widget
 * configuration equivalent of iOS's WidgetConfigurationIntent, so runtime values are written by an
 * in-app screen and read here at render time.
 *
 * Keys are namespaced `voltra.config.<widgetId>.<key>` for widget-type values — unchanged from
 * before the instance layer existed, so nothing stored is rewritten and no migration runs — and
 * `voltra.instance.<widgetId>.<appWidgetId>.<key>` for instance values.
 *
 * The instance prefix carries the widget id so an `appWidgetId` the launcher recycles across widget
 * types cannot leak values into the new placement even if `onDeleted` never fired for the old one.
 * The two prefixes cannot overlap: a widget id is part of a generated Kotlin class name and so
 * contains no dot, and every prefix scan below ends with a dot, so a scan for instance `4` of
 * widget `x` (`voltra.instance.x.4.`) never matches a key written for instance `42`.
 */
internal class VoltraConfigurationStore(
    private val context: Context,
    /**
     * Defaults to the app-wide store. Injectable so unit tests can supply a DataStore they own and
     * cancel: the `preferencesDataStore` delegate is a process singleton, and one left running past
     * the test that created it fails asynchronously inside whatever runs next.
     */
    private val dataStore: DataStore<Preferences> = context.voltraConfigurationDataStore,
) {
    /**
     * The configuration one placement renders with: defaults, overlaid with the widget-type values,
     * overlaid with [appWidgetId]'s own values. Passing no [appWidgetId] returns defaults plus
     * widget-type values — what the trial render and the type-level getter read.
     *
     * Both layers come out of a single DataStore snapshot, so a concurrent write cannot be seen by
     * one layer and missed by the other.
     */
    suspend fun get(
        widgetId: String,
        appWidgetId: Int? = null,
    ): Map<String, String> {
        val snapshot = dataStore.data.first()
        val typeValues = readPrefixed(snapshot, typeKeyPrefix(widgetId))
        val instanceValues =
            if (appWidgetId == null) {
                emptyMap()
            } else {
                readPrefixed(snapshot, instanceKeyPrefix(widgetId, appWidgetId))
            }
        return loadDefaults(widgetId) + typeValues + instanceValues
    }

    /** Write one widget-type value: the default every placement without its own value renders. */
    suspend fun set(
        widgetId: String,
        key: String,
        value: String,
    ) {
        val prefKey = stringPreferencesKey(typeKeyPrefix(widgetId) + key)
        dataStore.edit { it[prefKey] = value }
    }

    /**
     * Write every entry of [values] for one placement in a single DataStore transaction, so a
     * multi-key write is never half-applied and costs one render.
     */
    suspend fun setInstanceValues(
        widgetId: String,
        appWidgetId: Int,
        values: Map<String, String>,
    ) {
        val prefix = instanceKeyPrefix(widgetId, appWidgetId)
        dataStore.edit { preferences ->
            values.forEach { (key, value) ->
                preferences[stringPreferencesKey(prefix + key)] = value
            }
        }
    }

    /**
     * Drop every instance value of one placement. The widget-type values and the defaults are left
     * alone, so the placement falls back to what an unconfigured placement shows.
     */
    suspend fun clearInstance(
        widgetId: String,
        appWidgetId: Int,
    ) = clearInstances(widgetId, listOf(appWidgetId))

    /**
     * [clearInstance] for several placements at once, in a single transaction. Used by
     * `onDeleted`, which is handed every id the launcher removed in one go.
     */
    suspend fun clearInstances(
        widgetId: String,
        appWidgetIds: List<Int>,
    ) {
        if (appWidgetIds.isEmpty()) return
        val prefixes = appWidgetIds.map { instanceKeyPrefix(widgetId, it) }
        dataStore.edit { preferences ->
            preferences
                .asMap()
                .keys
                .filter { key -> prefixes.any { key.name.startsWith(it) } }
                .forEach { preferences.remove(it) }
        }
    }

    /**
     * Move each placement's instance values from its old `appWidgetId` to the new one the launcher
     * assigned in `onRestored`, in a single transaction. A new id that already holds values keeps
     * them only where the old placement had none for the same key: the restored placement is the
     * one the user configured, so its values win. Old keys are removed. Pairs whose ids are equal
     * are no-ops.
     */
    suspend fun remapInstances(
        widgetId: String,
        oldAppWidgetIds: List<Int>,
        newAppWidgetIds: List<Int>,
    ) {
        val pairs = oldAppWidgetIds.zip(newAppWidgetIds).filter { (old, new) -> old != new }
        if (pairs.isEmpty()) return
        dataStore.edit { preferences ->
            // Read every old placement first so a chain like 1→2, 2→3 does not read what the
            // previous pair just wrote.
            val moved =
                pairs.map { (old, new) ->
                    val oldPrefix = instanceKeyPrefix(widgetId, old)
                    val entries =
                        preferences
                            .asMap()
                            .filter { (key, value) -> key.name.startsWith(oldPrefix) && value is String }
                            .map { (key, value) -> key.name.substring(oldPrefix.length) to value as String }
                    Triple(oldPrefix, instanceKeyPrefix(widgetId, new), entries)
                }
            moved.forEach { (oldPrefix, _, _) ->
                preferences
                    .asMap()
                    .keys
                    .filter { it.name.startsWith(oldPrefix) }
                    .forEach { preferences.remove(it) }
            }
            moved.forEach { (_, newPrefix, entries) ->
                entries.forEach { (key, value) -> preferences[stringPreferencesKey(newPrefix + key)] = value }
            }
        }
    }

    /** Every value stored under [prefix], keyed by the part of the key that follows it. */
    private fun readPrefixed(
        snapshot: Preferences,
        prefix: String,
    ): Map<String, String> {
        val out = mutableMapOf<String, String>()
        snapshot.asMap().forEach { (key, value) ->
            if (key.name.startsWith(prefix) && value is String) {
                out[key.name.substring(prefix.length)] = value
            }
        }
        return out
    }

    // Reads the plugin-emitted defaults once and caches them: { "<widgetId>": { "<key>": "<value>" } }.
    private fun loadDefaults(widgetId: String): Map<String, String> {
        val cached = defaultsCache
        if (cached != null) return cached[widgetId] ?: emptyMap()

        val parsed =
            try {
                context.assets
                    .open(DEFAULTS_ASSET_PATH)
                    .bufferedReader()
                    .use { it.readText() }
            } catch (e: IOException) {
                Log.d(TAG, "No $DEFAULTS_ASSET_PATH — Dynamic Widget configuration starts empty")
                defaultsCache = emptyMap()
                return emptyMap()
            }

        val root = JSONObject(parsed)
        val all = mutableMapOf<String, Map<String, String>>()
        root.keys().forEach { id ->
            val obj = root.getJSONObject(id)
            val widgetMap = mutableMapOf<String, String>()
            obj.keys().forEach { key -> widgetMap[key] = obj.getString(key) }
            all[id] = widgetMap
        }
        defaultsCache = all
        return all[widgetId] ?: emptyMap()
    }

    private fun typeKeyPrefix(widgetId: String): String = "$TYPE_PREFIX$widgetId."

    private fun instanceKeyPrefix(
        widgetId: String,
        appWidgetId: Int,
    ): String = "$INSTANCE_PREFIX$widgetId.$appWidgetId."

    companion object {
        private const val TAG = "VoltraConfigurationStore"
        private const val DEFAULTS_ASSET_PATH = "voltra/widget_config_defaults.json"

        /** Unchanged since before the instance layer: stored values are never rewritten. */
        private const val TYPE_PREFIX = "voltra.config."
        private const val INSTANCE_PREFIX = "voltra.instance."

        @Volatile
        private var defaultsCache: Map<String, Map<String, String>>? = null

        /**
         * Stand in for the plugin-emitted defaults asset, which a Robolectric application does not
         * ship, so the three-layer precedence can be asserted with a non-empty defaults layer.
         * Pass null to drop the seed; the cache is process-wide, so tests must reset it.
         */
        @VisibleForTesting
        internal fun seedDefaultsForTesting(defaults: Map<String, Map<String, String>>?) {
            defaultsCache = defaults
        }
    }
}

private val Context.voltraConfigurationDataStore by preferencesDataStore(name = "voltra_widget_configuration")
