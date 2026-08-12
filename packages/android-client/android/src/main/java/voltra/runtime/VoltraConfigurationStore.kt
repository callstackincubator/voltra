package voltra.runtime

import android.content.Context
import android.util.Log
import androidx.annotation.VisibleForTesting
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
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
 * Three layers, merged at read time:
 *  - **Defaults** declared in code (`app.json` widget `appIntent.parameters[].default`), emitted by
 *    the config plugin to `assets/voltra/widget_config_defaults.json`. These are the values the
 *    widget shows before the user configures anything — the Android equivalent of iOS's
 *    `@Parameter(default:)`.
 *  - **Widget-type stored** values written at runtime (see setWidgetConfiguration), which override
 *    the defaults for every instance of the same widget type.
 *  - **Instance stored** values written at runtime (see setWidgetInstanceConfiguration), which
 *    override both defaults and widget-type values for one specific `appWidgetId`.
 *
 * Stands in for a real Glance configuration activity: Android has no system-managed widget
 * configuration equivalent of iOS's WidgetConfigurationIntent, so runtime values are written by an
 * in-app screen and read here at render time. Keys are namespaced
 * `voltra.config.widget.<widgetId>.<key>` for widget-type values and
 * `voltra.config.instance.<appWidgetId>.<key>` for per-instance values.
 */
internal class VoltraConfigurationStore(
    private val context: Context,
) {
    /** Code-declared defaults merged with widget-type and per-instance runtime values (stored wins). */
    suspend fun get(
        widgetId: String,
        appWidgetId: Int? = null,
    ): Map<String, String> {
        migrateLegacyKeysIfNeeded()
        val snapshot = context.voltraConfigurationDataStore.data.first()
        val typeValues = getStored(snapshot, widgetId)
        val instanceValues = if (appWidgetId != null) getStoredInstance(snapshot, appWidgetId) else emptyMap()
        return loadDefaults(widgetId) + typeValues + instanceValues
    }

    suspend fun set(
        widgetId: String,
        key: String,
        value: String,
    ) {
        migrateLegacyKeysIfNeeded()
        val prefKey = stringPreferencesKey(keyPrefix(widgetId) + key)
        context.voltraConfigurationDataStore.edit { it[prefKey] = value }
    }

    /** Write all [values] for one widget instance in a single DataStore transaction. */
    suspend fun setValues(
        appWidgetId: Int,
        values: Map<String, String>,
    ) {
        migrateLegacyKeysIfNeeded()
        val prefix = keyPrefix(appWidgetId)
        context.voltraConfigurationDataStore.edit { preferences ->
            values.forEach { (key, value) ->
                preferences[stringPreferencesKey(prefix + key)] = value
            }
        }
    }

    suspend fun clearInstance(appWidgetId: Int) {
        migrateLegacyKeysIfNeeded()
        val prefix = keyPrefix(appWidgetId)
        context.voltraConfigurationDataStore.edit { preferences ->
            val keysToRemove = preferences.asMap().keys.filter { it.name.startsWith(prefix) }
            keysToRemove.forEach { preferences.remove(it) }
        }
    }

    private fun getStored(
        snapshot: Preferences,
        widgetId: String,
    ): Map<String, String> {
        val prefix = keyPrefix(widgetId)
        val out = mutableMapOf<String, String>()
        snapshot.asMap().forEach { (key, value) ->
            if (key.name.startsWith(prefix) && value is String) {
                out[key.name.substring(prefix.length)] = value
            }
        }
        return out
    }

    private fun getStoredInstance(
        snapshot: Preferences,
        appWidgetId: Int,
    ): Map<String, String> {
        val prefix = keyPrefix(appWidgetId)
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

    /**
     * One-time migration of legacy `voltra.config.<widgetId>.<key>` keys (predating the
     * `voltra.config.widget.` / `voltra.config.instance.` namespacing) to the new
     * `voltra.config.widget.<widgetId>.<key>` form, then drops the legacy key. Idempotent: guarded
     * by a persisted flag plus a process-level cache so it only touches DataStore once per process.
     * Must run before any read or write.
     */
    private suspend fun migrateLegacyKeysIfNeeded() {
        if (migrated) return

        context.voltraConfigurationDataStore.edit { preferences ->
            if (preferences[migratedKey] == true) {
                migrated = true
                return@edit
            }

            val legacyEntries =
                preferences.asMap().entries.filter { (key, value) ->
                    value is String &&
                        !key.name.startsWith(NEW_TYPE_PREFIX) &&
                        !key.name.startsWith(NEW_INSTANCE_PREFIX) &&
                        key.name.startsWith(LEGACY_PREFIX) &&
                        key.name != migratedKey.name
                }

            legacyEntries.forEach { (key, value) ->
                val suffix = key.name.substring(LEGACY_PREFIX.length)
                val newKey = stringPreferencesKey(NEW_TYPE_PREFIX + suffix)
                // New-format value wins if both exist — do not overwrite it.
                if (preferences[newKey] == null) {
                    preferences[newKey] = value as String
                }
                preferences.remove(key)
            }

            preferences[migratedKey] = true
            migrated = true
        }
    }

    private fun keyPrefix(widgetId: String): String = "$NEW_TYPE_PREFIX$widgetId."

    private fun keyPrefix(appWidgetId: Int): String = "$NEW_INSTANCE_PREFIX$appWidgetId."

    companion object {
        private const val TAG = "VoltraConfigurationStore"
        private const val DEFAULTS_ASSET_PATH = "voltra/widget_config_defaults.json"
        private const val LEGACY_PREFIX = "voltra.config."
        private const val NEW_TYPE_PREFIX = "voltra.config.widget."
        private const val NEW_INSTANCE_PREFIX = "voltra.config.instance."

        private val migratedKey = booleanPreferencesKey("voltra.config.migrated.v2")

        @Volatile
        private var defaultsCache: Map<String, Map<String, String>>? = null

        @Volatile
        private var migrated: Boolean = false

        /**
         * Reset the process-level caches. Robolectric resets statics per test class, not per test
         * method, so tests that depend on the migration running must clear this between methods.
         */
        @VisibleForTesting
        internal fun resetProcessCachesForTesting() {
            migrated = false
            defaultsCache = null
        }
    }
}

// Internal (rather than private) so unit tests can seed/inspect raw DataStore state, e.g. to
// verify the legacy-key migration in VoltraConfigurationStoreTest.
internal val Context.voltraConfigurationDataStore by preferencesDataStore(name = "voltra_widget_configuration")
