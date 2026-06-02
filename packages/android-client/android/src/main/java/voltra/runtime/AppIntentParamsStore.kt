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
 * DataStore-backed storage for per-widget AppIntent parameter values.
 *
 * Mirrors iOS Track 2's AppIntent-parameter source: on iOS those values live in
 * the `WidgetConfigurationIntent` struct populated by WidgetKit when the user
 * edits the widget. Android has no system-managed equivalent today — for the
 * Track 4 PoC the values are written by an in-app screen (Phase 4) and consumed
 * by `VoltraGlanceWidget.provideGlance()` to feed the Hermes resolver.
 *
 * Keys are namespaced as `voltra.appintent.<widgetId>.<paramName>` so multiple
 * widget ids and multiple parameters per widget coexist cleanly.
 *
 * Defaults declared in `app.json` are written by the config plugin to
 * `assets/voltra/appintent_defaults.json`. [getParamsWithDefaults] merges them
 * under any user-set values so a freshly-installed widget renders meaningfully
 * before the user has interacted with the parameter source.
 */
internal class AppIntentParamsStore(
    private val context: Context,
) {
    suspend fun getParams(widgetId: String): Map<String, String> {
        val prefix = paramPrefix(widgetId)
        val snapshot = context.appIntentParamsDataStore.data.first()
        val out = mutableMapOf<String, String>()
        snapshot.asMap().forEach { (key, value) ->
            val name = key.name
            if (name.startsWith(prefix) && value is String) {
                out[name.substring(prefix.length)] = value
            }
        }
        return out
    }

    suspend fun getParamsWithDefaults(widgetId: String): Map<String, String> {
        val defaults = loadDefaults(widgetId)
        val stored = getParams(widgetId)
        return defaults + stored
    }

    suspend fun setParam(
        widgetId: String,
        name: String,
        value: String,
    ) {
        val key = stringPreferencesKey(paramPrefix(widgetId) + name)
        context.appIntentParamsDataStore.edit { it[key] = value }
    }

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
                Log.d(TAG, "No appintent_defaults.json — defaulting to empty params")
                defaultsCache = emptyMap()
                return emptyMap()
            }

        val root = JSONObject(parsed)
        val all = mutableMapOf<String, Map<String, String>>()
        root.keys().forEach { id ->
            val obj = root.getJSONObject(id)
            val widgetMap = mutableMapOf<String, String>()
            obj.keys().forEach { paramName -> widgetMap[paramName] = obj.getString(paramName) }
            all[id] = widgetMap
        }
        defaultsCache = all
        return all[widgetId] ?: emptyMap()
    }

    private fun paramPrefix(widgetId: String): String = "voltra.appintent.$widgetId."

    companion object {
        private const val TAG = "AppIntentParamsStore"
        private const val DEFAULTS_ASSET_PATH = "voltra/appintent_defaults.json"

        @Volatile
        private var defaultsCache: Map<String, Map<String, String>>? = null
    }
}

private val Context.appIntentParamsDataStore by preferencesDataStore(name = "voltra_appintent_params")
