package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import voltra.widget.server.WidgetScope

/**
 * The refresh button on a server-driven Dynamic Widget.
 *
 * Unlike the payload engine's button, which fetches inline, this enqueues expedited work. A tap
 * with no signal then waits for connectivity and retries with backoff instead of failing silently,
 * and the fetch runs under the same constraints and through the same code path as every other
 * update — so a refresh cannot produce props a scheduled run would have rejected.
 *
 * Glance writes this class name into the `RemoteViews` the launcher holds for a placed widget, so
 * it must not move or be renamed once a release ships it.
 */
class DynamicWidgetRefreshActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val widgetId = parameters[KEY_WIDGET_ID]

        if (widgetId == null) {
            Log.e(TAG, "No widget id in the refresh action parameters")
            return
        }

        DynamicWidgetServerUpdateScheduler.requestImmediateUpdate(context, WidgetScope.of(widgetId))
    }

    companion object {
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_widget_id")

        private const val TAG = "VoltraDynamicRefresh"
    }
}
