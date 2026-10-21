package voltra.dynamicwidget

import android.util.Log
import androidx.annotation.VisibleForTesting
import voltra.models.VoltraNode
import java.util.concurrent.ConcurrentHashMap

/** What a Dynamic Widget placement draws (ADR 0013, section 3). */
internal sealed interface DynamicWidgetShownContent {
    /** A node to hand to the Glance renderer: the live render, the last good one or the placeholder. */
    data class Node(
        val node: VoltraNode,
    ) : DynamicWidgetShownContent

    /** The dev error view. Composed from plain Glance primitives, never from a [VoltraNode]. */
    data class DevError(
        val failure: DynamicWidgetRenderOutcome.Failure,
    ) : DynamicWidgetShownContent

    /** Nothing to show: no live render, no last good render and no placeholder. */
    data object Loading : DynamicWidgetShownContent
}

/**
 * One rule, with no configuration: loud in dev, graceful in release.
 *
 * - A successful render is always shown.
 * - A failure in a debuggable build is shown as the dev error view, even when a last good render or
 *   a placeholder exists, because hiding it behind plausible content is the bug this fixes.
 * - A failure in a release build keeps the placement's last good render, else the placeholder, else
 *   [DynamicWidgetShownContent.Loading].
 *
 * [lastGood] and [placeholder] are lazy: they hit disk and the asset decoder, and the success path
 * needs neither.
 */
internal fun chooseDynamicWidgetContent(
    isDev: Boolean,
    outcome: DynamicWidgetRenderOutcome,
    lastGood: () -> VoltraNode?,
    placeholder: () -> VoltraNode?,
): DynamicWidgetShownContent =
    when (outcome) {
        is DynamicWidgetRenderOutcome.Success -> {
            DynamicWidgetShownContent.Node(outcome.node)
        }

        is DynamicWidgetRenderOutcome.Failure -> {
            if (isDev) {
                DynamicWidgetShownContent.DevError(outcome)
            } else {
                (lastGood() ?: placeholder())?.let { DynamicWidgetShownContent.Node(it) }
                    ?: DynamicWidgetShownContent.Loading
            }
        }
    }

/**
 * Everything `Content` decides before it draws, as one plain function so it can be tested without a
 * composition (ADR 0013):
 *
 * - a bundle that failed to load is the outcome, and [render] is not called;
 * - otherwise [render] runs and its outcome is the one used;
 * - the outcome is logged, and a successful node is written to [lastGoodStore] in every build, so
 *   dev runs exercise the write path even though only release reads it back;
 * - [chooseDynamicWidgetContent] then picks what to draw.
 *
 * A placement whose [appWidgetId] could not be resolved has no last good render, in either
 * direction.
 */
internal fun resolveDynamicWidgetContent(
    widgetId: String,
    appWidgetId: Int?,
    isDev: Boolean,
    bundleState: DynamicWidgetBundleState,
    render: () -> DynamicWidgetRenderOutcome,
    lastGoodStore: DynamicWidgetLastGoodStore,
    parseNode: (String) -> VoltraNode?,
    placeholder: () -> VoltraNode?,
): DynamicWidgetShownContent {
    val outcome =
        when (bundleState) {
            is DynamicWidgetBundleState.Ready -> render()
            is DynamicWidgetBundleState.Failed -> bundleState.failure
        }

    when (outcome) {
        is DynamicWidgetRenderOutcome.Failure -> {
            DynamicWidgetFailureLog.failed(widgetId, appWidgetId, outcome, isDev)
        }

        is DynamicWidgetRenderOutcome.Success -> {
            DynamicWidgetFailureLog.succeeded(widgetId, appWidgetId)
            if (appWidgetId != null) {
                lastGoodStore.write(widgetId, appWidgetId, outcome.nodeJson)
            }
        }
    }

    return chooseDynamicWidgetContent(
        isDev = isDev,
        outcome = outcome,
        lastGood = { appWidgetId?.let { lastGoodStore.read(widgetId, it) }?.let(parseNode) },
        placeholder = placeholder,
    )
}

/** The most stack frames the dev error view prints; the widget is small. */
internal const val DEV_ERROR_MAX_STACK_FRAMES = 6

/**
 * The `at …` frames of a JS stack, at most [limit]. Hermes prints the error's own `Name: message`
 * line first and the view already shows the message, so only the frames are kept.
 */
internal fun devErrorStackFrames(
    stack: String?,
    limit: Int = DEV_ERROR_MAX_STACK_FRAMES,
): List<String> =
    stack
        ?.lineSequence()
        ?.map { it.trim() }
        ?.filter { it.startsWith("at ") }
        ?.take(limit)
        ?.toList()
        .orEmpty()

/**
 * Failure and recovery logging for one placement (ADR 0013, section 6), under the single
 * `VoltraDynamicWidget` tag so one filter finds every Dynamic Widget render problem.
 */
internal object DynamicWidgetFailureLog {
    const val TAG = "VoltraDynamicWidget"

    private val failedPlacements = ConcurrentHashMap.newKeySet<String>()

    fun failureLine(
        widgetId: String,
        appWidgetId: Int?,
        failure: DynamicWidgetRenderOutcome.Failure,
        dev: Boolean,
    ): String =
        "render failed widgetId=$widgetId appWidgetId=${appWidgetId ?: "unknown"} " +
            "stage=${failure.stage.label} dev=$dev: ${failure.message}"

    fun recoveredLine(
        widgetId: String,
        appWidgetId: Int?,
    ): String = "render recovered widgetId=$widgetId appWidgetId=${appWidgetId ?: "unknown"}"

    /** One `Log.e` per failure; the JS stack follows in the same call, in dev only. */
    fun failed(
        widgetId: String,
        appWidgetId: Int?,
        failure: DynamicWidgetRenderOutcome.Failure,
        dev: Boolean,
    ) {
        failedPlacements.add(placementKey(widgetId, appWidgetId))
        val line = failureLine(widgetId, appWidgetId, failure, dev)
        Log.e(TAG, if (dev && !failure.stack.isNullOrBlank()) "$line\n${failure.stack}" else line)
    }

    /** One `Log.i` for the first success of a placement after a failure; silent otherwise. */
    fun succeeded(
        widgetId: String,
        appWidgetId: Int?,
    ) {
        if (failedPlacements.remove(placementKey(widgetId, appWidgetId))) {
            Log.i(TAG, recoveredLine(widgetId, appWidgetId))
        }
    }

    @VisibleForTesting
    fun reset() {
        failedPlacements.clear()
    }

    private fun placementKey(
        widgetId: String,
        appWidgetId: Int?,
    ) = "$widgetId#${appWidgetId ?: "unknown"}"
}
