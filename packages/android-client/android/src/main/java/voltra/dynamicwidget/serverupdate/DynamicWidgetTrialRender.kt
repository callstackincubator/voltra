package voltra.dynamicwidget.serverupdate

import android.content.Context
import android.util.Log
import voltra.dynamicwidget.renderDynamicWidgetForTrial
import voltra.widget.server.WidgetScope

/**
 * Renders fetched props once, off screen, before they are allowed anywhere near the widget.
 *
 * Props that do not render are never committed: a server that starts returning a shape the widget
 * throws on leaves the last good props on screen rather than replacing them with an error box.
 *
 * The trial uses one environment — the widget's target cell size, in the current theme and locale.
 * A widget that only throws for another size slips through, and ADR 0002 accepts that: rendering
 * every possible size on every fetch would cost more than the failure it prevents.
 */
internal object DynamicWidgetTrialRender {
    private const val TAG = "VoltraDynamicTrialRender"

    suspend fun canRender(
        context: Context,
        scope: WidgetScope,
        propsJson: String,
    ): Boolean =
        try {
            renderDynamicWidgetForTrial(context, scope.widgetId, propsJson) != null
        } catch (e: Throwable) {
            Log.e(TAG, "Trial render for '${scope.widgetId}' threw: ${e.message}")
            false
        }
}
