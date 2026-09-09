package voltra.widget.server

/**
 * Server-update settings as one layer holds them: every field is optional, and an unset field
 * means "this layer has no opinion, ask the layer below".
 *
 * [body] is kept as the raw JSON text the app supplied rather than a parsed tree, because Voltra
 * never inspects it — it only forwards it as the request body.
 */
data class WidgetServerUpdateSettings(
    val url: String? = null,
    val intervalMinutes: Long? = null,
    val enabled: Boolean? = null,
    val method: String? = null,
    val query: Map<String, String>? = null,
    val headers: Map<String, String>? = null,
    val body: String? = null,
) {
    val isEmpty: Boolean
        get() =
            url == null &&
                intervalMinutes == null &&
                enabled == null &&
                method == null &&
                query == null &&
                headers == null &&
                body == null

    companion object {
        val EMPTY = WidgetServerUpdateSettings()
    }
}

/**
 * The flattened settings a fetch actually runs on. Every field is decided: [intervalMinutes] has
 * the floor and ceiling applied, [enabled] and [method] have their defaults filled in, and [query]
 * and [headers] are the per-key merge of every layer.
 *
 * [url] is the one field that can still be absent, and it means the widget is server-driven but has
 * nowhere to fetch from yet — the app is expected to supply one with `setWidgetServerUpdate`.
 */
data class ResolvedWidgetServerSettings(
    val url: String?,
    val intervalMinutes: Long,
    val enabled: Boolean,
    val method: String,
    val query: Map<String, String>,
    val headers: Map<String, String>,
    val body: String?,
) {
    /** True when this widget has both a URL to fetch and permission to do it. */
    val shouldFetch: Boolean
        get() = enabled && !url.isNullOrBlank()
}

object WidgetServerUpdateDefaults {
    /**
     * WorkManager will not run periodic work more often than every 15 minutes, so asking for less
     * would only misreport what the widget actually does.
     */
    const val MIN_INTERVAL_MINUTES = 15L

    /**
     * A day. Past this the widget is effectively not server-driven, and `Cache-Control: max-age`
     * from a misconfigured server should not be able to park a widget for a week.
     */
    const val MAX_INTERVAL_MINUTES = 24L * 60L

    const val DEFAULT_INTERVAL_MINUTES = MIN_INTERVAL_MINUTES

    const val DEFAULT_METHOD = "GET"

    /** Methods either platform's HTTP stack can send. */
    val SUPPORTED_METHODS = setOf("GET", "POST", "PUT", "PATCH", "DELETE")

    /** Methods that cannot carry a body. A body set alongside one of these is dropped. */
    val BODYLESS_METHODS = setOf("GET", "HEAD")

    /**
     * Query keys Voltra puts on every request. An app that set one of these would silently shadow
     * what the server relies on, so `setWidgetServerUpdate` rejects them.
     */
    val RESERVED_QUERY_KEYS = setOf("widgetId", "platform", "family", "theme", "locale", "instance")

    /** Serialized size cap for one layer, so a runaway `body` cannot fill the settings store. */
    const val MAX_LAYER_BYTES = 16 * 1024

    fun clampIntervalMinutes(intervalMinutes: Long): Long =
        intervalMinutes.coerceIn(MIN_INTERVAL_MINUTES, MAX_INTERVAL_MINUTES)
}
