package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
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
 * The button belongs to one placement, so the tap carries that placement's scope (ADR 0007) and not
 * just the widget id: a placement configured for New York has to refresh New York's instance, whose
 * fetch, ETag, props slot and `env.serverUpdate` are all separate from the widget's.
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
        val scope = scopeFrom(parameters)

        if (scope == null) {
            Log.e(TAG, "No widget id in the refresh action parameters")
            return
        }

        DynamicWidgetServerUpdateScheduler.requestImmediateUpdate(context, scope)
    }

    companion object {
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_widget_id")

        /** The placement's instance key (ADR 0007), absent when it has no configuration. */
        val KEY_INSTANCE_KEY = ActionParameters.Key<String>("voltra_instance_key")

        /** What the button is built with, so the tap can name the placement that drew it. */
        fun parametersFor(scope: WidgetScope): ActionParameters =
            when (scope) {
                is WidgetScope.Widget -> {
                    actionParametersOf(KEY_WIDGET_ID to scope.widgetId)
                }

                is WidgetScope.Instance -> {
                    actionParametersOf(
                        KEY_WIDGET_ID to scope.widgetId,
                        KEY_INSTANCE_KEY to scope.key,
                    )
                }
            }

        /**
         * The scope a tap should refresh, or null when the parameters carry no widget id at all.
         *
         * A missing instance key means the widget scope. That covers a placement with no
         * configuration, and also a button drawn by a build from before the key existed — those
         * launcher-held `RemoteViews` outlive an app update, and the widget scope is what they
         * refreshed before, so they keep working until the widget next re-renders.
         */
        fun scopeFrom(parameters: ActionParameters): WidgetScope? {
            val widgetId = parameters[KEY_WIDGET_ID] ?: return null
            val instanceKey = parameters[KEY_INSTANCE_KEY]

            return if (instanceKey == null) {
                WidgetScope.of(widgetId)
            } else {
                WidgetScope.Instance(widgetId, instanceKey)
            }
        }

        private const val TAG = "VoltraDynamicRefresh"
    }
}
