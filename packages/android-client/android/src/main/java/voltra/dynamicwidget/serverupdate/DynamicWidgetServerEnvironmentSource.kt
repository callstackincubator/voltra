package voltra.dynamicwidget.serverupdate

import android.content.Context
import androidx.glance.action.Action
import androidx.glance.appwidget.action.actionRunCallback
import voltra.dynamicwidget.DynamicWidgetEnvironmentSource
import voltra.widget.server.VoltraWidgetServer
import voltra.widget.server.WidgetScope

/**
 * Contributes `env.serverUpdate` to a server-driven Dynamic Widget's render.
 *
 * This is the whole of what ADR 0002 adds to the render path: the widget is told how the last
 * fetch went, so it can show "updated 3 min ago", dim itself when the data is stale, or hide its
 * freshness line entirely while the app has taken it over.
 */
internal class DynamicWidgetServerEnvironmentSource : DynamicWidgetEnvironmentSource {
    override fun environmentFields(
        context: Context,
        scope: WidgetScope,
    ): Map<String, Any> {
        val status = DynamicWidgetServerPropsStore(context).status(scope)

        return mapOf("serverUpdate" to status.toJson())
    }

    override fun refreshAction(
        context: Context,
        scope: WidgetScope,
    ): Action? {
        if (VoltraWidgetServer.defaults(context).defaults(scope.widgetId)?.refresh != true) {
            return null
        }

        return actionRunCallback<DynamicWidgetRefreshActionCallback>(
            DynamicWidgetRefreshActionCallback.parametersFor(scope),
        )
    }
}
