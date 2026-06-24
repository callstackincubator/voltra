package voltra.runtime

import android.content.Context
import android.util.Log
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
        val typeValues = getStored(widgetId)
        val instanceValues = if (appWidgetId != null) getStoredInstance(appWidgetId) else emptyMap()
        return loadDefaults(widgetId) + typeValues + instanceValues
    }

    suspend fun set(
        widgetId: String,
        key: String,
        value: String,
    ) {
        val prefKey = stringPreferencesKey(keyPrefix(widgetId) + key)
        context.voltraConfigurationDataStore.edit { it[prefKey] = value }
    }

    suspend fun setInstance(
        appWidgetId: Int,
        key: String,
        value: String,
    ) {
        val prefKey = stringPreferencesKey(keyPrefix(appWidgetId) + key)
        context.voltraConfigurationDataStore.edit { it[prefKey] = value }
    }

    suspend fun clearInstance(appWidgetId: Int) {
        val prefix = keyPrefix(appWidgetId)
        context.voltraConfigurationDataStore.edit { preferences ->
            val keysToRemove = preferences.asMap().keys.filter { it.name.startsWith(prefix) }
            keysToRemove.forEach { preferences.remove(it) }
        }
    }

    private suspend fun getStored(widgetId: String): Map<String, String> {
        val prefix = keyPrefix(widgetId)
        val legacyPrefix = legacyKeyPrefix(widgetId)
        val snapshot = context.voltraConfigurationDataStore.data.first()
        val out = mutableMapOf<String, String>()
        snapshot.asMap().forEach { (key, value) ->
            if (key.name.startsWith(legacyPrefix) && value is String) {
                out[key.name.substring(legacyPrefix.length)] = value
            }
        }
        snapshot.asMap().forEach { (key, value) ->
            if (key.name.startsWith(prefix) && value is String) {
                out[key.name.substring(prefix.length)] = value
            }
        }
        return out
    }

    private suspend fun getStoredInstance(appWidgetId: Int): Map<String, String> {
        val prefix = keyPrefix(appWidgetId)
        val snapshot = context.voltraConfigurationDataStore.data.first()
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

    private fun keyPrefix(widgetId: String): String = "voltra.config.widget.$widgetId."

    private fun legacyKeyPrefix(widgetId: String): String = "voltra.config.$widgetId."

    private fun keyPrefix(appWidgetId: Int): String = "voltra.config.instance.$appWidgetId."

    companion object {
        private const val TAG = "VoltraConfigurationStore"
        private const val DEFAULTS_ASSET_PATH = "voltra/widget_config_defaults.json"

        @Volatile
        private var defaultsCache: Map<String, Map<String, String>>? = null
    }
}

private val Context.voltraConfigurationDataStore by preferencesDataStore(name = "voltra_widget_configuration")
