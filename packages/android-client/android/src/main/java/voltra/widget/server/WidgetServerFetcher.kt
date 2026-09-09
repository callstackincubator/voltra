package voltra.widget.server

import android.util.Log
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

/**
 * What came back from the server, before either engine decides what it means.
 *
 * The request side is identical for a payload widget and a Dynamic Widget, so it lives here once.
 * Only the interpretation of [body] differs: one parses a Voltra payload, the other props.
 */
sealed class WidgetServerFetchResult {
    /** `200` with a body. [etag] is present when the response carried one. */
    data class Success(
        val body: String,
        val etag: String?,
        val httpStatus: Int,
        val nextIntervalMinutes: Long?,
    ) : WidgetServerFetchResult()

    /** `304`: what is already committed is still current. */
    data class NotModified(
        val nextIntervalMinutes: Long?,
    ) : WidgetServerFetchResult()

    /** The request never completed: no connectivity, DNS, TLS, or a timeout. */
    data class NetworkFailure(
        val message: String,
    ) : WidgetServerFetchResult()

    /**
     * A `2xx` whose body is over [WidgetServerFetcher.MAX_BODY_BYTES]. Kept apart from
     * [HttpFailure] because the server did answer: this is a body the device refuses, so it is
     * reported as a parse failure and asking again is pointless.
     */
    data class TooLarge(
        val httpStatus: Int,
    ) : WidgetServerFetchResult()

    /**
     * The server answered with a status we cannot use. [retryAfterMinutes] carries `Retry-After`
     * when the server sent one on a `429` or `503`.
     */
    data class HttpFailure(
        val httpStatus: Int,
        val retryAfterMinutes: Long?,
    ) : WidgetServerFetchResult() {
        val isUnauthorized: Boolean
            get() = httpStatus == 401 || httpStatus == 403

        /** True when waiting and asking again could plausibly succeed. */
        val isTransient: Boolean
            get() = httpStatus >= 500 || httpStatus == 429
    }
}

/**
 * Executes a [WidgetServerRequest] and reports what happened, without deciding what to do about it.
 */
object WidgetServerFetcher {
    private const val TAG = "VoltraWidgetServerFetch"

    /**
     * Bodies larger than this are refused. The iOS widget extension has a 30 MB ceiling for the
     * whole render, and a widget that needs more than a quarter of a megabyte of props is not
     * going to fit on a home screen either.
     */
    const val MAX_BODY_BYTES = 256 * 1024

    /** Redirects are followed only within the configured host, and only this many times. */
    private const val MAX_REDIRECTS = 3

    fun fetch(request: WidgetServerRequest): WidgetServerFetchResult {
        var current = request
        var redirects = 0

        while (true) {
            val connection =
                try {
                    WidgetServerRequestBuilder.open(current)
                } catch (e: IOException) {
                    return WidgetServerFetchResult.NetworkFailure(e.message ?: "Failed to open connection")
                }

            try {
                val status =
                    try {
                        connection.responseCode
                    } catch (e: IOException) {
                        return WidgetServerFetchResult.NetworkFailure(e.message ?: "Request failed")
                    }

                if (status in REDIRECT_STATUSES) {
                    val next =
                        resolveRedirect(current, connection) ?: return WidgetServerFetchResult.HttpFailure(status, null)

                    if (redirects >= MAX_REDIRECTS) {
                        Log.w(TAG, "Too many redirects for ${request.url}")
                        return WidgetServerFetchResult.HttpFailure(status, null)
                    }

                    redirects += 1
                    current =
                        if (status == 303) {
                            // 303 means "fetch the result of your request from here", which is a GET.
                            current.copy(url = next, method = "GET", body = null)
                        } else {
                            current.copy(url = next)
                        }
                    continue
                }

                val nextIntervalMinutes = maxAgeMinutes(connection.getHeaderField("Cache-Control"))

                if (status == HttpURLConnection.HTTP_NOT_MODIFIED) {
                    return WidgetServerFetchResult.NotModified(nextIntervalMinutes)
                }

                if (status !in 200..299) {
                    return WidgetServerFetchResult.HttpFailure(
                        httpStatus = status,
                        retryAfterMinutes = retryAfterMinutes(connection.getHeaderField("Retry-After")),
                    )
                }

                val body =
                    try {
                        readBody(connection)
                    } catch (e: IOException) {
                        return WidgetServerFetchResult.NetworkFailure(e.message ?: "Failed to read response")
                    }

                if (body == null) {
                    // Over the size cap. Retrying returns the same oversized body, so this is a
                    // failure the app has to fix rather than one to back off from.
                    Log.e(TAG, "Response from ${current.url} is larger than $MAX_BODY_BYTES bytes")
                    return WidgetServerFetchResult.TooLarge(status)
                }

                return WidgetServerFetchResult.Success(
                    body = body,
                    etag = connection.getHeaderField("ETag"),
                    httpStatus = status,
                    nextIntervalMinutes = nextIntervalMinutes,
                )
            } finally {
                connection.disconnect()
            }
        }
    }

    private val REDIRECT_STATUSES = setOf(301, 302, 303, 307, 308)

    /**
     * Same-host redirects only. Following one to another host would send the app's Authorization
     * header somewhere it never agreed to send it.
     */
    private fun resolveRedirect(
        request: WidgetServerRequest,
        connection: HttpURLConnection,
    ): URL? {
        val location = connection.getHeaderField("Location") ?: return null

        val target =
            try {
                URL(request.url, location)
            } catch (_: Exception) {
                return null
            }

        if (!target.host.equals(request.url.host, ignoreCase = true) || target.protocol != request.url.protocol) {
            Log.w(TAG, "Refusing cross-host redirect from ${request.url.host} to ${target.host}")
            return null
        }

        return target
    }

    /** Returns null when the body is over [MAX_BODY_BYTES]. */
    private fun readBody(connection: HttpURLConnection): String? {
        if (connection.contentLength > MAX_BODY_BYTES) {
            return null
        }

        connection.inputStream.use { stream ->
            val buffer = ByteArray(8 * 1024)
            // Bytes are collected whole and decoded once: decoding chunk by chunk would corrupt a
            // multi-byte character that straddles a read boundary.
            val out = ByteArrayOutputStream()

            while (true) {
                val read = stream.read(buffer)
                if (read == -1) break

                if (out.size() + read > MAX_BODY_BYTES) return null

                out.write(buffer, 0, read)
            }

            return out.toString(Charsets.UTF_8.name())
        }
    }

    /** `Cache-Control: max-age=N`, in minutes, rounded down. */
    internal fun maxAgeMinutes(header: String?): Long? {
        val value = header ?: return null
        val match = Regex("max-age\\s*=\\s*(\\d+)", RegexOption.IGNORE_CASE).find(value) ?: return null
        val seconds = match.groupValues[1].toLongOrNull() ?: return null

        return seconds / 60
    }

    /**
     * `Retry-After`, in minutes, rounded up so we never retry early.
     *
     * The header is delta-seconds or an HTTP date; both are in the wild, so both are read.
     */
    internal fun retryAfterMinutes(
        header: String?,
        now: Long = System.currentTimeMillis(),
    ): Long? {
        val value = header?.trim()?.takeIf { it.isNotEmpty() } ?: return null

        value.toLongOrNull()?.let { seconds ->
            return if (seconds <= 0) null else (seconds + 59) / 60
        }

        val date =
            try {
                SimpleDateFormat(HTTP_DATE_FORMAT, Locale.US)
                    .apply { timeZone = TimeZone.getTimeZone("GMT") }
                    .parse(value)
            } catch (_: Exception) {
                null
            } ?: return null

        val seconds = (date.time - now) / 1000

        return if (seconds <= 0) null else (seconds + 59) / 60
    }

    private const val HTTP_DATE_FORMAT = "EEE, dd MMM yyyy HH:mm:ss zzz"
}
