package voltra.widget.server

import android.content.Context
import android.content.res.Configuration
import android.net.Uri
import android.os.Build
import android.util.Log
import java.net.HttpURLConnection
import java.net.URL

/**
 * A request, fully decided, before anything opens a socket. Keeping this separate from the
 * connection is what lets the request contract be unit-tested: what a backend sees is a value, not
 * a side effect.
 */
data class WidgetServerRequest(
    val url: URL,
    val method: String,
    val headers: Map<String, String>,
    val body: ByteArray?,
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is WidgetServerRequest) return false

        return url == other.url &&
            method == other.method &&
            headers == other.headers &&
            body.contentEqualsOrBothNull(other.body)
    }

    override fun hashCode(): Int {
        var result = url.hashCode()
        result = 31 * result + method.hashCode()
        result = 31 * result + headers.hashCode()
        result = 31 * result + (body?.contentHashCode() ?: 0)
        return result
    }
}

private fun ByteArray?.contentEqualsOrBothNull(other: ByteArray?): Boolean =
    if (this == null || other == null) this == null && other == null else contentEquals(other)

/**
 * Turns resolved settings plus Voltra's own request parameters into the request the device sends.
 *
 * Both engines build their requests here, so a payload widget and a Dynamic Widget send the same
 * shape and the app's runtime overrides apply to both. Only the response and what the device does
 * with it differ.
 */
object WidgetServerRequestBuilder {
    private const val TAG = "VoltraWidgetServerReq"

    private const val CONNECT_TIMEOUT_MS = 15_000
    private const val READ_TIMEOUT_MS = 15_000

    /**
     * @param etag from the last `200`, sent as `If-None-Match`. Callers pass null when the stored
     *   ETag belongs to a different URL than the one being fetched now.
     * @return null when there is nothing to fetch — no URL, or fetching is off.
     */
    fun build(
        context: Context,
        scope: WidgetScope,
        settings: ResolvedWidgetServerSettings,
        etag: String? = null,
    ): WidgetServerRequest? {
        if (!settings.shouldFetch) {
            return null
        }

        val method = settings.method.uppercase()

        val builder =
            Uri
                .parse(settings.url)
                .buildUpon()
                .appendQueryParameter("widgetId", scope.widgetId)
                .appendQueryParameter("platform", "android")
                .appendQueryParameter("theme", currentTheme(context))
                .appendQueryParameter("locale", currentLocale(context))

        // Voltra's own keys are appended first and the app's keys are rejected at call time if they
        // collide, so nothing here can shadow what the server relies on.
        settings.query.forEach { (key, value) -> builder.appendQueryParameter(key, value) }

        val headers = mutableMapOf<String, String>()
        headers["Accept"] = "application/json"
        headers["User-Agent"] = userAgent()
        headers.putAll(settings.headers)

        if (etag != null) {
            headers["If-None-Match"] = etag
        }

        var body = settings.body?.toByteArray(Charsets.UTF_8)

        if (body != null && method in WidgetServerUpdateDefaults.BODYLESS_METHODS) {
            // HttpURLConnection silently turns a GET with an output stream into a POST, which would
            // hit a different endpoint than the app asked for. Dropping the body is the lesser
            // surprise, and it is documented.
            Log.w(TAG, "Dropping request body for widget '${scope.widgetId}': $method cannot carry one")
            body = null
        }

        if (body != null) {
            headers["Content-Type"] = "application/json"
        }

        return WidgetServerRequest(
            url = URL(builder.build().toString()),
            method = method,
            headers = headers,
            body = body,
        )
    }

    /** Opens and configures a connection for [request]. The caller connects, reads, and disconnects. */
    fun open(request: WidgetServerRequest): HttpURLConnection {
        val connection = request.url.openConnection() as HttpURLConnection

        connection.requestMethod = request.method
        connection.connectTimeout = CONNECT_TIMEOUT_MS
        connection.readTimeout = READ_TIMEOUT_MS
        // Redirects are followed by WidgetServerFetcher instead, which refuses to leave the host
        // the app configured so an Authorization header cannot be replayed somewhere else.
        connection.instanceFollowRedirects = false

        request.headers.forEach { (key, value) -> connection.setRequestProperty(key, value) }

        request.body?.let { body ->
            connection.doOutput = true
            connection.outputStream.use { it.write(body) }
        }

        return connection
    }

    fun currentTheme(context: Context): String {
        val nightModeFlags = context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK
        return if (nightModeFlags == Configuration.UI_MODE_NIGHT_YES) "dark" else "light"
    }

    fun currentLocale(context: Context): String {
        val configuration = context.resources.configuration
        val locale =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                configuration.locales[0]
            } else {
                @Suppress("DEPRECATION")
                configuration.locale
            }

        return locale?.toLanguageTag() ?: "en"
    }

    private fun userAgent(): String =
        "VoltraWidget/${voltra.BuildConfig.VOLTRA_VERSION} (Android/${Build.VERSION.RELEASE})"
}
