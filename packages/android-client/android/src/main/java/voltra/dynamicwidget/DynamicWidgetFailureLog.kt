package voltra.dynamicwidget

import android.util.Log
import androidx.annotation.VisibleForTesting
import java.util.concurrent.ConcurrentHashMap

/**
 * Failure and recovery logging for one placement at one size (ADR 0013, section 6), under the single
 * `VoltraDynamicWidget` tag so one filter finds every Dynamic Widget render problem.
 *
 * Glance composes a placement once per size it reports, so "logged once" has to be tracked per
 * `(widgetId, appWidgetId, family)`: tracked per placement, a widget that fails at one size only
 * would log a failure and a recovery on every pass.
 */
internal object DynamicWidgetFailureLog {
    const val TAG = "VoltraDynamicWidget"

    private val failedPlacements = ConcurrentHashMap.newKeySet<String>()

    fun failureLine(
        widgetId: String,
        appWidgetId: Int?,
        family: String,
        failure: DynamicWidgetRenderOutcome.Failure,
        dev: Boolean,
    ): String =
        "render failed widgetId=$widgetId appWidgetId=${appWidgetId ?: "unknown"} family=$family " +
            "stage=${failure.stage.label} dev=$dev: ${failure.message}"

    fun recoveredLine(
        widgetId: String,
        appWidgetId: Int?,
        family: String,
    ): String = "render recovered widgetId=$widgetId appWidgetId=${appWidgetId ?: "unknown"} family=$family"

    /** One `Log.e` per failure; the JS stack follows in the same call, in dev only. */
    fun failed(
        widgetId: String,
        appWidgetId: Int?,
        family: String,
        failure: DynamicWidgetRenderOutcome.Failure,
        dev: Boolean,
    ) {
        failedPlacements.add(placementKey(widgetId, appWidgetId, family))
        val line = failureLine(widgetId, appWidgetId, family, failure, dev)
        Log.e(TAG, if (dev && !failure.stack.isNullOrBlank()) "$line\n${failure.stack}" else line)
    }

    /** One `Log.i` for the first success of a placement size after a failure; silent otherwise. */
    fun succeeded(
        widgetId: String,
        appWidgetId: Int?,
        family: String,
    ) {
        if (failedPlacements.remove(placementKey(widgetId, appWidgetId, family))) {
            Log.i(TAG, recoveredLine(widgetId, appWidgetId, family))
        }
    }

    @VisibleForTesting
    fun reset() {
        failedPlacements.clear()
    }

    private fun placementKey(
        widgetId: String,
        appWidgetId: Int?,
        family: String,
    ) = "$widgetId#${appWidgetId ?: "unknown"}#$family"
}
