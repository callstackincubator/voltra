package voltra.runtime

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

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

    suspend fun setParam(
        widgetId: String,
        name: String,
        value: String,
    ) {
        val key = stringPreferencesKey(paramPrefix(widgetId) + name)
        context.appIntentParamsDataStore.edit { it[key] = value }
    }

    private fun paramPrefix(widgetId: String): String = "voltra.appintent.$widgetId."
}

private val Context.appIntentParamsDataStore by preferencesDataStore(name = "voltra_appintent_params")
