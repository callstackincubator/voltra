package voltra.widget.server

import android.content.Context
import android.util.Log
import org.json.JSONObject

/**
 * Build-time server-update defaults, read from the generated asset
 * `voltra/widget_server_defaults.json`.
 *
 * These used to be inlined into each generated receiver as a URL and an interval literal. Moving
 * them into an asset is what lets the runtime settings store override them: a receiver cannot be
 * asked what its interval is now that the app can change it.
 *
 * Shape, keyed by widget id:
 * ```json
 * { "portfolio": { "url": "https://api.example.com/portfolio", "intervalMinutes": 30, "refresh": true } }
 * ```
 *
 * A widget id present in this map is server-driven. `url` is absent when app.json declared
 * `serverUpdate` without one, meaning the app supplies it at runtime.
 */
class WidgetServerDefaultsStore(
    private val context: Context,
) {
    @Volatile
    private var cached: Map<String, Defaults>? = null

    data class Defaults(
        val url: String?,
        val intervalMinutes: Long,
        val refresh: Boolean,
    )

    fun defaults(widgetId: String): Defaults? = all()[widgetId]

    fun isServerDriven(widgetId: String): Boolean = all().containsKey(widgetId)

    fun serverDrivenWidgetIds(): Set<String> = all().keys

    private fun all(): Map<String, Defaults> {
        cached?.let { return it }

        synchronized(this) {
            cached?.let { return it }

            val parsed = read()
            cached = parsed
            return parsed
        }
    }

    private fun read(): Map<String, Defaults> {
        val raw =
            try {
                context.assets
                    .open(ASSET_PATH)
                    .bufferedReader()
                    .use { it.readText() }
            } catch (_: Exception) {
                // No server-driven widgets in this app: the generator writes no asset at all.
                return emptyMap()
            }

        return try {
            val json = JSONObject(raw)
            val defaults = mutableMapOf<String, Defaults>()

            json.keys().forEach { widgetId ->
                val entry = json.optJSONObject(widgetId) ?: return@forEach
                val url = if (entry.has("url") && !entry.isNull("url")) entry.getString("url") else null

                defaults[widgetId] =
                    Defaults(
                        url = url?.takeIf { it.isNotBlank() },
                        intervalMinutes =
                            WidgetServerUpdateDefaults.clampIntervalMinutes(
                                entry.optLong("intervalMinutes", WidgetServerUpdateDefaults.DEFAULT_INTERVAL_MINUTES),
                            ),
                        refresh = entry.optBoolean("refresh", false),
                    )
            }

            defaults
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse $ASSET_PATH: ${e.message}", e)
            emptyMap()
        }
    }

    companion object {
        const val ASSET_PATH = "voltra/widget_server_defaults.json"
        private const val TAG = "VoltraWidgetServerDefaults"
    }
}

/** Lowest layer: what app.json asked for, read-only. */
class ConfigWidgetServerSettingsLayer(
    private val defaults: WidgetServerDefaultsStore,
) : WidgetServerSettingsLayer {
    override val name: String = "config"

    override suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings? {
        val entry = defaults.defaults(scope.widgetId) ?: return null

        return WidgetServerUpdateSettings(
            url = entry.url,
            intervalMinutes = entry.intervalMinutes,
        )
    }

    override suspend fun isServerDriven(scope: WidgetScope): Boolean = defaults.isServerDriven(scope.widgetId)
}
