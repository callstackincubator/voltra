package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import androidx.glance.appwidget.GlanceAppWidget
import voltra.dynamicwidget.lifecycle.DynamicWidgetLifecycleEvents
import voltra.dynamicwidget.lifecycle.DynamicWidgetPlacementRegistry
import voltra.events.VoltraEventBus
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
     * After the cleanup, the placements leave the placement registry and each is reported as
     * `widgetRemoved`.
     *
     * `VoltraServerDrivenClientWidgetReceiver.onDeleted` calls `super.onDeleted`, so it inherits
     * this cleanup and the event, both before its schedule recompute.
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
        DynamicWidgetLifecycleEvents.onDeleted(widgetId, appWidgetIds, DynamicWidgetPlacementRegistry(context)) {
            VoltraEventBus.send(context, it)
        }
    }

    /**
     * Glance has no "added" callback: a placement Voltra has not recorded yet arrives as
     * `widgetAdded` from this or [onAppWidgetOptionsChanged], whichever sees it first.
     */
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        DynamicWidgetLifecycleEvents.onPlacementsSeen(
            widgetId,
            appWidgetIds,
            { WidgetPlacementSize.fromOptions(appWidgetManager.getAppWidgetOptions(it)) },
            DynamicWidgetPlacementRegistry(context),
        ) { VoltraEventBus.send(context, it) }
    }

    /** Reports a new placement as [onUpdate] does, and a known placement whose size changed as `widgetResized`. */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
        DynamicWidgetLifecycleEvents.onOptionsChanged(
            widgetId,
            appWidgetId,
            newOptions,
            DynamicWidgetPlacementRegistry(context),
        ) { VoltraEventBus.send(context, it) }
    }

    /**
     * `widgetEnabled` unless the registry already holds a placement of this widget type,
     * which is the case for the broadcast the system re-sends at boot and after an app update.
     */
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        DynamicWidgetLifecycleEvents.onEnabled(widgetId, DynamicWidgetPlacementRegistry(context)) {
            VoltraEventBus.send(context, it)
        }
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        DynamicWidgetLifecycleEvents.onDisabled(widgetId, DynamicWidgetPlacementRegistry(context)) {
            VoltraEventBus.send(context, it)
        }
    }

    /**
     * The launcher restored its layout (device restore, launcher backup) and gave every placement a
     * new `appWidgetId`. Move each placement's data to its new id so a London widget is still
     * London after the restore instead of falling back to the widget-type values. Same threading
     * and failure rules as [onDeleted].
     *
     * After the remap, each placement the registry knew moves to its new id and is reported as
     * `widgetRestored`.
     */
    override fun onRestored(
        context: Context,
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
    ) {
        super.onRestored(context, oldWidgetIds, newWidgetIds)
        DynamicWidgetPlacementData.onRestored(context, widgetId, oldWidgetIds, newWidgetIds)
        DynamicWidgetLifecycleEvents.onRestored(
            widgetId,
            oldWidgetIds,
            newWidgetIds,
            DynamicWidgetPlacementRegistry(context),
        ) { VoltraEventBus.send(context, it) }
    }
}
