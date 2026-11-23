package voltra.dynamicwidget

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log
import androidx.annotation.VisibleForTesting
import com.facebook.react.modules.systeminfo.AndroidInfoHelpers
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import voltra.BuildConfig
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

/**
 * Whether a Dynamic Widget's bundle is evaluated and ready to render (ADR 0013, section 2).
 */
internal sealed interface DynamicWidgetBundleState {
    data object Ready : DynamicWidgetBundleState

    data class Failed(
        val failure: DynamicWidgetRenderOutcome.Failure,
    ) : DynamicWidgetBundleState
}

/**
 * The process-wide record of each widget id's bundle state.
 *
 * `provideGlance` used to hand `provideContent` a captured `bundleReady` boolean. Glance keeps a
 * session alive across `update()` calls and does not re-run `provideGlance` for it, so a bundle
 * that failed to load when the session began stayed "not ready" for the rest of the session, even
 * after Metro came back. The composition now reads this record on every pass, and a retry rewrites
 * it.
 *
 * It is in memory only: the bundle itself lives in the process-wide Hermes runtime, so a new
 * process loads it again anyway and a persisted failure would only go stale.
 */
internal object DynamicWidgetBundleRecord {
    private val states = ConcurrentHashMap<String, DynamicWidgetBundleState>()

    fun record(
        widgetId: String,
        state: DynamicWidgetBundleState,
    ) {
        states[widgetId] = state
    }

    /**
     * What the composition should draw for [widgetId]. A widget nothing has loaded in this process
     * yet reads as a failed bundle: `provideGlance` always records before it provides content, so
     * this is a safety net rather than a state a placement is expected to see.
     */
    fun get(widgetId: String): DynamicWidgetBundleState =
        states[widgetId]
            ?: DynamicWidgetBundleState.Failed(bundleFailure("The bundle has not been loaded in this process"))

    @VisibleForTesting
    fun clear() {
        states.clear()
    }
}

/** Whether this is a debuggable build: the one that reads Metro and shows the dev error view. */
internal fun isDynamicWidgetDev(context: Context): Boolean =
    (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0

/** A bundle that could not be loaded at all (Metro, or the baked asset). */
internal fun bundleFailure(
    message: String,
    stack: String? = null,
): DynamicWidgetRenderOutcome.Failure =
    DynamicWidgetRenderOutcome.Failure(DynamicWidgetRenderOutcome.Stage.Bundle, message, stack)

/**
 * Loads a Dynamic Widget's bundle: fetch (Metro in a debug build, the baked asset otherwise),
 * evaluate into the shared Hermes runtime, and record the outcome in [DynamicWidgetBundleRecord]
 * (ADR 0013, section 2).
 *
 * The one entry point, [load], always records. The record is keyed by widget id, not by placement,
 * so the result of a load from any caller (a Glance session starting, the dev error view's retry,
 * the server-update trial render) is the right state for every placement of that widget.
 */
internal object DynamicWidgetBundleLoader {
    private const val TAG = "VoltraClientGlanceWidget"

    /** A loader's way of saying why there is no bundle text; [load] turns it into a failed state. */
    private class BundleUnavailableException(
        val failure: DynamicWidgetRenderOutcome.Failure,
    ) : Exception(failure.message)

    suspend fun load(
        context: Context,
        widgetId: String,
    ): DynamicWidgetBundleState {
        val state =
            try {
                val source =
                    if (isDynamicWidgetDev(context)) {
                        fetchDevBundle(context, widgetId)
                    } else {
                        loadBakedBundle(context, widgetId)
                    }
                evaluateBundleSource(source, widgetId)
            } catch (e: BundleUnavailableException) {
                DynamicWidgetBundleState.Failed(e.failure)
            }
        DynamicWidgetBundleRecord.record(widgetId, state)

        return state
    }

    /**
     * Fetch the raw widget bundle from Metro (dev). A network error or a non-2xx answer is
     * reported with its cause: the host for an unreachable Metro, and the `error` field of
     * Metro's `500 {"error": ...}` body for a bundle that failed to build.
     */
    private suspend fun fetchDevBundle(
        context: Context,
        widgetId: String,
    ): String =
        withContext(Dispatchers.IO) {
            // AndroidInfoHelpers resolves the dev server host for emulator (10.0.2.2),
            // physical device, or adb-reverse — the RN-native equivalent of iOS's
            // RCTBundleURLProvider.
            val host = AndroidInfoHelpers.getServerHost(context)
            val urlString = "http://$host/voltra/widgets/$widgetId.bundle?platform=android&dev=true"
            val t0 = System.nanoTime()
            try {
                val connection = URL(urlString).openConnection() as HttpURLConnection
                connection.connectTimeout = 5_000
                connection.readTimeout = 5_000
                connection.requestMethod = "GET"
                try {
                    val code = connection.responseCode
                    if (code !in 200..299) {
                        Log.e(TAG, "Metro HTTP $code for $urlString")
                        val errorBody =
                            try {
                                connection.errorStream?.bufferedReader()?.use { it.readText() }
                            } catch (e: IOException) {
                                null
                            }
                        throw BundleUnavailableException(
                            bundleFailure(metroHttpFailureMessage(code, urlString, errorBody)),
                        )
                    }
                    val body = connection.inputStream.bufferedReader().use { it.readText() }
                    if (BuildConfig.DEBUG) {
                        Log.i(
                            TAG,
                            "[perf] metro fetch: ${"%.2f".format(
                                (System.nanoTime() - t0) / 1_000_000.0,
                            )} ms (${body.length} chars)",
                        )
                    }
                    body
                } finally {
                    connection.disconnect()
                }
            } catch (e: BundleUnavailableException) {
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "Metro fetch failed ($urlString): ${e.message}")
                throw BundleUnavailableException(bundleFailure(metroUnreachableMessage(host, e.message)))
            }
        }

    /**
     * Read the release bundle baked into the app's assets by the Gradle bundling task
     * (assets/voltra/voltra-widget-<id>.bundle). The release counterpart of [fetchDevBundle];
     * reports the missing asset path (→ last good render or prerendered fallback).
     */
    private fun loadBakedBundle(
        context: Context,
        widgetId: String,
    ): String {
        val assetPath = "voltra/voltra-widget-$widgetId.bundle"

        return try {
            context.assets
                .open(assetPath)
                .bufferedReader()
                .use { it.readText() }
        } catch (e: IOException) {
            Log.w(TAG, "No baked bundle for widgetId=$widgetId (assets/$assetPath)")
            throw BundleUnavailableException(bundleFailure(missingBakedBundleMessage("assets/$assetPath")))
        }
    }
}

/**
 * Evaluates [source] and reports the outcome: [DynamicWidgetBundleState.Ready], or a failed
 * [DynamicWidgetRenderOutcome.Stage.Evaluate] carrying the JavaScript message and stack.
 */
internal fun evaluateBundleSource(
    source: String,
    widgetId: String,
    evaluate: (String, String) -> Unit = VoltraJSRenderer::evaluateBundle,
): DynamicWidgetBundleState =
    try {
        evaluate(source, widgetId)
        DynamicWidgetBundleState.Ready
    } catch (e: VoltraJSException) {
        DynamicWidgetBundleState.Failed(
            DynamicWidgetRenderOutcome.Failure(
                DynamicWidgetRenderOutcome.Stage.Evaluate,
                e.message ?: "bundle evaluation failed",
                e.jsStack,
            ),
        )
    }

private const val MAX_METRO_ERROR_CHARS = 512

/** `Metro unreachable at <host>: <cause>` — the connection never produced an HTTP answer. */
internal fun metroUnreachableMessage(
    host: String,
    cause: String?,
): String = "Metro unreachable at $host: ${cause ?: "unknown error"}"

/**
 * `Metro HTTP <code> for <url>: <error>`. Metro's middleware answers a broken widget with
 * `500 {"error": "<message>"}`, so the `error` field is the useful part; a body that is not that
 * shape contributes nothing rather than dumping HTML into a widget.
 */
internal fun metroHttpFailureMessage(
    code: Int,
    url: String,
    body: String?,
): String {
    val error = body?.let(::metroErrorField)

    return if (error.isNullOrBlank()) {
        "Metro HTTP $code for $url"
    } else {
        "Metro HTTP $code for $url: ${error.take(MAX_METRO_ERROR_CHARS)}"
    }
}

private fun metroErrorField(body: String): String? =
    try {
        JSONObject(body).optString("error").takeIf { it.isNotEmpty() }
    } catch (e: org.json.JSONException) {
        null
    }

/** The release counterpart: the asset the Gradle bundling task should have baked in. */
internal fun missingBakedBundleMessage(assetPath: String): String =
    "Baked bundle is missing from the app's assets: $assetPath"
