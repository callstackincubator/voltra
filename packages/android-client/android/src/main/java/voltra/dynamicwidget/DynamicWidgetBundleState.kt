package voltra.dynamicwidget

import androidx.annotation.VisibleForTesting
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

/** Whether a Dynamic Widget's bundle is evaluated and ready to render (ADR 0013, section 2). */
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

/** A bundle that could not be loaded at all (Metro, or the baked asset). */
internal fun bundleFailure(
    message: String,
    stack: String? = null,
): DynamicWidgetRenderOutcome.Failure =
    DynamicWidgetRenderOutcome.Failure(DynamicWidgetRenderOutcome.Stage.Bundle, message, stack)

/**
 * Evaluates [source] and reports the outcome: [DynamicWidgetBundleState.Ready], or a failed
 * [DynamicWidgetRenderOutcome.Stage.Evaluate] carrying the JavaScript message and stack.
 */
internal fun evaluateBundleSource(
    source: String,
    widgetId: String,
    evaluate: (String, String) -> Unit = VoltraJSRenderer::evaluateBundleOrThrow,
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
