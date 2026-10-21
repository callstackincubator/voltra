package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.action.ActionCallback
import java.util.concurrent.ConcurrentHashMap

/**
 * "Tap to retry" on the dev error view (ADR 0013, section 4).
 *
 * It reloads the bundle from Metro, evaluates it again, records the result for the composition to
 * read, and re-renders the tapped placement. It never runs in a release build: the error view that
 * carries this action is dev-only.
 *
 * Glance writes this class name into the `RemoteViews` the launcher holds, so it must not move or
 * be renamed once a release ships it.
 */
class DynamicWidgetRetryActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val widgetId = parameters[KEY_WIDGET_ID]
        if (widgetId == null) {
            Log.e(DynamicWidgetFailureLog.TAG, "No widget id in the retry action parameters")
            return
        }

        DynamicWidgetRetryCoordinator(
            reloadBundle = { VoltraClientGlanceWidget.loadAndRecordBundle(context, it) },
            triggerUpdate = { id, tapped -> triggerDynamicWidgetRetryGlanceUpdate(context, id, tapped) },
        ).retry(widgetId, glanceId)
    }

    companion object {
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_retry_widget_id")

        /** What the error view's tap target is built with. */
        fun parametersFor(widgetId: String): ActionParameters = actionParametersOf(KEY_WIDGET_ID to widgetId)
    }
}

/**
 * The retry sequence's one rule: a tap while a retry for the same widget id is still running does
 * nothing, so a second tap cannot start a second Metro fetch against the runtime lock.
 *
 * The bundle lives in one process-wide runtime, so [reloadBundle] refreshes it for every placement
 * of the widget id. Only the tapped placement is told to recompose right away
 * ([triggerUpdate], which advances its retry revision); the others pick the new bundle up on their
 * next render. Retry does not refetch server props; the server refresh button keeps doing that.
 */
internal class DynamicWidgetRetryCoordinator(
    private val reloadBundle: suspend (widgetId: String) -> Unit,
    private val triggerUpdate: suspend (widgetId: String, tapped: GlanceId) -> Unit,
) {
    /** @return false when a retry for [widgetId] was already running and this tap was ignored. */
    suspend fun retry(
        widgetId: String,
        tappedGlanceId: GlanceId,
    ): Boolean {
        if (!inFlight.add(widgetId)) return false

        try {
            reloadBundle(widgetId)
            triggerUpdate(widgetId, tappedGlanceId)
        } finally {
            inFlight.remove(widgetId)
        }

        return true
    }

    private companion object {
        // Process-wide: callbacks build a new coordinator per tap.
        val inFlight: MutableSet<String> = ConcurrentHashMap.newKeySet()
    }
}
