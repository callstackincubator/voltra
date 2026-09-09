package voltra.widget.server

import android.net.Uri

/**
 * Call-time rules for `setWidgetServerUpdate`. Rejecting here rather than at fetch time means the
 * app learns about a bad setting from the promise it just awaited, instead of from a widget that
 * quietly stops updating hours later.
 */
object WidgetServerSettingsValidator {
    /** Hosts reachable over plain http, so a debug build can talk to a dev server. */
    private val LOCAL_HTTP_HOSTS = setOf("localhost", "127.0.0.1", "::1", "10.0.2.2", "10.0.3.2")

    /**
     * @param isDebugBuild whether plain http to a local dev host is allowed. Release builds have
     *   cleartext traffic blocked anyway, so allowing it there would only defer the failure.
     * @return an error message, or null when the settings are usable.
     */
    fun validate(
        settings: WidgetServerUpdateSettings,
        isDebugBuild: Boolean,
    ): String? {
        settings.url?.let { url ->
            validateUrl(url, isDebugBuild)?.let { return it }
        }

        settings.intervalMinutes?.let { interval ->
            if (interval <= 0) {
                return "intervalMinutes must be a positive number of minutes"
            }
        }

        settings.method?.let { method ->
            if (method.uppercase() !in WidgetServerUpdateDefaults.SUPPORTED_METHODS) {
                return "method '$method' is not supported. Use one of " +
                    WidgetServerUpdateDefaults.SUPPORTED_METHODS.joinToString(", ")
            }
        }

        settings.query?.keys?.forEach { key ->
            if (key in WidgetServerUpdateDefaults.RESERVED_QUERY_KEYS) {
                return "query key '$key' is reserved by Voltra and is sent on every request"
            }
        }

        val encoded = WidgetServerSettingsCodec.encode(settings)

        if (encoded.toByteArray(Charsets.UTF_8).size > WidgetServerUpdateDefaults.MAX_LAYER_BYTES) {
            return "settings are larger than ${WidgetServerUpdateDefaults.MAX_LAYER_BYTES} bytes once serialized"
        }

        return null
    }

    private fun validateUrl(
        url: String,
        isDebugBuild: Boolean,
    ): String? {
        if (url.isBlank()) {
            return "url must not be empty"
        }

        val parsed = Uri.parse(url)
        val scheme = parsed.scheme?.lowercase()
        val host = parsed.host

        if (scheme == null || host.isNullOrBlank()) {
            return "url '$url' must be an absolute http(s) URL"
        }

        if (scheme == "https") {
            return null
        }

        if (scheme != "http") {
            return "url '$url' must be an absolute http(s) URL"
        }

        if (isDebugBuild && host in LOCAL_HTTP_HOSTS) {
            return null
        }

        return "url '$url' must use https. Plain http is allowed only in a debug build, and only " +
            "for ${LOCAL_HTTP_HOSTS.joinToString(", ")}."
    }
}
