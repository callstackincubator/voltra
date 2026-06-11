package voltra.runtime

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

/**
 * DataStore-backed per-widget configuration for client-rendered widgets — the values surfaced as
 * `env.configuration` in the widget's `(props, env) => JSX` render.
 *
 * Stands in for a real Glance configuration activity: Android has no system-managed widget
 * configuration equivalent of iOS's WidgetConfigurationIntent, so for now the values are written
 * by an in-app screen (see setWidgetConfiguration) and read here at render time. Keys are
 * namespaced `voltra.config.<widgetId>.<key>` so multiple widgets and keys coexist.
 */
internal class VoltraConfigurationStore(
    private val context: Context,
) {
    suspend fun get(widgetId: String): Map<String, String> {
        val prefix = keyPrefix(widgetId)
        val snapshot = context.voltraConfigurationDataStore.data.first()
        val out = mutableMapOf<String, String>()
        snapshot.asMap().forEach { (key, value) ->
            if (key.name.startsWith(prefix) && value is String) {
                out[key.name.substring(prefix.length)] = value
            }
        }
        return out
    }

    suspend fun set(
        widgetId: String,
        key: String,
        value: String,
    ) {
        val prefKey = stringPreferencesKey(keyPrefix(widgetId) + key)
        context.voltraConfigurationDataStore.edit { it[prefKey] = value }
    }

    private fun keyPrefix(widgetId: String): String = "voltra.config.$widgetId."
}

private val Context.voltraConfigurationDataStore by preferencesDataStore(name = "voltra_widget_configuration")
