package voltra.widget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import voltra.widget.payload.PayloadRefreshActionCallback

/**
 * Pinned at this fully qualified name (ADR 0000): Glance serializes an `ActionCallback`'s class
 * name into the `RemoteViews` the launcher already holds for a placed widget instance. Renaming
 * or moving this class would make the refresh button on every already-installed widget with the
 * refresh overlay enabled throw a `ClassNotFoundException` when tapped, until the widget is
 * removed and re-added. See ADR 0000 for the full rationale. The real refresh logic lives in
 * [PayloadRefreshActionCallback]; this class only delegates to it, so package moves of the
 * payload engine never touch this name.
 */
class VoltraRefreshActionCallback : ActionCallback {
    companion object {
        val KEY_WIDGET_ID = ActionParameters.Key<String>("voltra_widget_id")
    }

    private val delegate = PayloadRefreshActionCallback()

    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) = delegate.onAction(context, glanceId, parameters)
}
