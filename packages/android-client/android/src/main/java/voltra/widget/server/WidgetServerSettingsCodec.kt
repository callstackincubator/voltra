package voltra.widget.server

import org.json.JSONObject

/**
 * Serializes one settings layer for storage. Written as a small versioned envelope so a future
 * shape change can be recognised rather than guessed at, the same way Dynamic Widget props are
 * stored.
 */
object WidgetServerSettingsCodec {
    private const val VERSION_KEY = "widgetServerSettingsVersion"
    private const val SETTINGS_KEY = "widgetServerSettings"
    private const val VERSION = 1

    fun encode(settings: WidgetServerUpdateSettings): String {
        val payload = JSONObject()

        settings.url?.let { payload.put("url", it) }
        settings.intervalMinutes?.let { payload.put("intervalMinutes", it) }
        settings.enabled?.let { payload.put("enabled", it) }
        settings.method?.let { payload.put("method", it) }
        settings.query?.let { payload.put("query", JSONObject(it as Map<*, *>)) }
        settings.headers?.let { payload.put("headers", JSONObject(it as Map<*, *>)) }
        settings.body?.let { payload.put("body", it) }

        return JSONObject()
            .put(VERSION_KEY, VERSION)
            .put(SETTINGS_KEY, payload)
            .toString()
    }

    /** Returns null for anything this version cannot read, so a bad record reads as "no opinion". */
    fun decode(serialized: String?): WidgetServerUpdateSettings? {
        if (serialized.isNullOrBlank()) return null

        return try {
            val envelope = JSONObject(serialized)

            if (envelope.optInt(VERSION_KEY, -1) != VERSION) return null

            val payload = envelope.optJSONObject(SETTINGS_KEY) ?: return null

            WidgetServerUpdateSettings(
                url = payload.optStringOrNull("url"),
                intervalMinutes = if (payload.has("intervalMinutes")) payload.optLong("intervalMinutes") else null,
                enabled = if (payload.has("enabled")) payload.optBoolean("enabled") else null,
                method = payload.optStringOrNull("method"),
                query = payload.optStringMap("query"),
                headers = payload.optStringMap("headers"),
                body = payload.optStringOrNull("body"),
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun JSONObject.optStringOrNull(key: String): String? =
        if (has(key) &&
            !isNull(key)
        ) {
            getString(key)
        } else {
            null
        }

    private fun JSONObject.optStringMap(key: String): Map<String, String>? {
        val nested = optJSONObject(key) ?: return null
        val entries = mutableMapOf<String, String>()

        nested.keys().forEach { nestedKey ->
            entries[nestedKey] = nested.optString(nestedKey)
        }

        return entries
    }
}
