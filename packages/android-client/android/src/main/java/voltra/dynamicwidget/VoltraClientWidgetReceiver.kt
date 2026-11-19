package voltra.dynamicwidget

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetReceiver

/**
 * Base receiver for Dynamic Voltra widgets. Identical lifecycle to
 * [VoltraWidgetReceiver] but hosts a [VoltraClientGlanceWidget] (on-device JS render) instead
 * of the server-rendered `voltra.widget.payload.VoltraGlanceWidget`.
 *
 * Generated Dynamic Widget receivers extend this and provide their `widgetId`.
 */
abstract class VoltraClientWidgetReceiver : VoltraWidgetReceiver() {
    override val widgetKind: VoltraWidgetKind = VoltraWidgetKind.Dynamic

    override fun createGlanceAppWidget(): GlanceAppWidget = VoltraClientGlanceWidget(widgetId)

    // Client widgets use SizeMode.Exact, so Glance re-composes provideGlance for the new size on
    // resize; the base class's no-op default already covers that (there is no cached payload to
    // re-render from).

    /**
     * Drop the per-placement data of every placement the user removed: the instance configuration
     * (ADR 0006), so an `appWidgetId` the launcher later recycles starts from the widget-type
     * values, and the last good render (ADR 0013). See [DynamicWidgetPlacementData] for the
     * threading and failure rules.
     *
     * `VoltraServerDrivenClientWidgetReceiver.onDeleted` calls `super.onDeleted`, so it inherits
     * this cleanup.
     *
     * Robolectric has no widget host, so Glance's own `super.onDeleted` fails asynchronously there;
     * the cleanup lives in [DynamicWidgetPlacementData], which the tests call directly.
     */
    override fun onDeleted(
        context: Context,
        appWidgetIds: IntArray,
    ) {
        super.onDeleted(context, appWidgetIds)
        DynamicWidgetPlacementData.onDeleted(context, widgetId, appWidgetIds)
    }

    /**
     * The launcher restored its layout (device restore, launcher backup) and gave every placement a
     * new `appWidgetId`. Move each placement's data to its new id so a London widget is still
     * London after the restore instead of falling back to the widget-type values. Same threading
     * and failure rules as [onDeleted].
     */
    override fun onRestored(
        context: Context,
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
    ) {
        super.onRestored(context, oldWidgetIds, newWidgetIds)
        DynamicWidgetPlacementData.onRestored(context, widgetId, oldWidgetIds, newWidgetIds)
    }
}
