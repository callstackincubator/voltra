package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.action.ActionCallback
import java.util.concurrent.ConcurrentHashMap

/**
 * "Tap to retry" on the dev error view (ADR 0013, section 4).
 *
 * It reloads the bundle from Metro, evaluates it again, records the result for the composition to
 * read, and re-renders the tapped placement. It never runs in a release build: the error view that
 * carries this action is dev-only.
 *
 * The bundle lives in one process-wide runtime, so the reload refreshes it for every placement of
 * the widget id. Only the tapped placement is told to recompose right away, through the same
 * props-revision update a server fetch uses (the composition re-reads the bundle record on every
 * pass); the others pick the new bundle up on their next render. Retry does not refetch server
 * props; the server refresh button keeps doing that.
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

        runRetry(widgetId) {
            DynamicWidgetBundleLoader.load(context, widgetId)
            val tappedAppWidgetId = GlanceAppWidgetManager(context).getAppWidgetId(glanceId)
            triggerDynamicWidgetGlanceUpdateForPlacements(context, widgetId) { it == tappedAppWidgetId }
        }
    }

    companion object {
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_retry_widget_id")

        // Process-wide: Glance builds a new callback per tap.
        private val inFlight: MutableSet<String> = ConcurrentHashMap.newKeySet()

        /** What the error view's tap target is built with. */
        fun parametersFor(widgetId: String): ActionParameters = actionParametersOf(KEY_WIDGET_ID to widgetId)

        /**
         * Runs [retry] unless a retry for the same widget id is still running, so a second tap
         * cannot start a second Metro fetch against the runtime lock.
         *
         * @return false when a retry for [widgetId] was already running and this tap was ignored.
         */
        internal suspend fun runRetry(
            widgetId: String,
            retry: suspend () -> Unit,
        ): Boolean {
            if (!inFlight.add(widgetId)) return false

            try {
                retry()
            } finally {
                inFlight.remove(widgetId)
            }

            return true
        }
    }
}
