package voltra.widget.server

import org.json.JSONArray
import org.json.JSONObject

/**
 * Reads the settings object an app passes to `setWidgetServerUpdate`.
 *
 * Separate from [WidgetServerSettingsCodec], which is the versioned storage format: what the app
 * sends and what Voltra persists are allowed to diverge, and conflating them would make either one
 * hard to change. The one real difference today is `body`, which arrives as arbitrary JSON and is
 * kept as text because Voltra only forwards it.
 */
object WidgetServerUpdateSettingsJson {
    sealed class Result {
        data class Parsed(
            val settings: WidgetServerUpdateSettings,
        ) : Result()

        data class Invalid(
            val reason: String,
        ) : Result()
    }

    fun parse(json: String): Result {
        val root =
            try {
                JSONObject(json)
            } catch (_: Exception) {
                return Result.Invalid("settings must be a JSON object")
            }

        val query = stringMap(root, "query") ?: return Result.Invalid("query must be an object of strings")
        val headers = stringMap(root, "headers") ?: return Result.Invalid("headers must be an object of strings")

        return Result.Parsed(
            WidgetServerUpdateSettings(
                url = root.optStringOrNull("url"),
                intervalMinutes = if (root.has("intervalMinutes")) root.optLong("intervalMinutes") else null,
                enabled = if (root.has("enabled")) root.optBoolean("enabled") else null,
                method = root.optStringOrNull("method")?.uppercase(),
                query = query.takeIf { root.has("query") },
                headers = headers.takeIf { root.has("headers") },
                body = if (root.has("body") && !root.isNull("body")) jsonText(root.get("body")) else null,
            ),
        )
    }

    /**
     * Re-serializes a parsed value back to JSON text. `toString()` alone is wrong for a string
     * body: it would drop the quotes and send something that is not JSON at all.
     */
    private fun jsonText(value: Any): String =
        when (value) {
            is JSONObject, is JSONArray -> value.toString()
            is String -> JSONObject.quote(value)
            is Boolean, is Number -> value.toString()
            else -> JSONObject.quote(value.toString())
        }

    private fun JSONObject.optStringOrNull(key: String): String? =
        if (has(key) &&
            !isNull(key)
        ) {
            getString(key)
        } else {
            null
        }

    /** Returns an empty map when the key is absent, and null when it is present but not usable. */
    private fun stringMap(
        root: JSONObject,
        key: String,
    ): Map<String, String>? {
        if (!root.has(key) || root.isNull(key)) return emptyMap()

        val nested = root.optJSONObject(key) ?: return null
        val entries = mutableMapOf<String, String>()

        nested.keys().forEach { nestedKey ->
            val value = nested.opt(nestedKey)

            if (value !is String) return null

            entries[nestedKey] = value
        }

        return entries
    }
}
