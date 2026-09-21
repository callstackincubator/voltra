package voltra.dynamicwidget

import android.content.Context
import android.util.Log
import androidx.annotation.VisibleForTesting
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.runBlocking
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
    private companion object {
        private const val TAG = "VoltraClientWidgetReceiver"
    }

    override val widgetKind: VoltraWidgetKind = VoltraWidgetKind.Dynamic

    override fun createGlanceAppWidget(): GlanceAppWidget = VoltraClientGlanceWidget(widgetId)

    // Client widgets use SizeMode.Exact, so Glance re-composes provideGlance for the new size on
    // resize; the base class's no-op default already covers that (there is no cached payload to
    // re-render from).

    /**
     * Drop the per-instance configuration of every placement the user removed (ADR 0006), so an
     * `appWidgetId` the launcher later recycles starts from the widget-type values.
     *
     * The DataStore edit runs inside [runBlocking] rather than a launched coroutine — the pattern
     * `VoltraServerDrivenClientWidgetReceiver.onUpdate` already uses for the same reason.
     * `GlanceAppWidgetReceiver.onReceive` has already consumed the broadcast's `goAsync()`, so this
     * override cannot claim one, and a coroutine launched without a keep-alive risks the process
     * being reclaimed before the write lands.
     *
     * Failures are logged, never thrown: a broadcast receiver that throws crashes the app, and a
     * missed cleanup is bounded — instance keys carry the widget id, so a recycled id can only ever
     * surface values from a placement of this same widget.
     *
     * `VoltraServerDrivenClientWidgetReceiver.onDeleted` calls `super.onDeleted`, so it inherits
     * this cleanup.
     */
    override fun onDeleted(
        context: Context,
        appWidgetIds: IntArray,
    ) {
        super.onDeleted(context, appWidgetIds)
        clearInstanceConfiguration(context, appWidgetIds)
    }

    /**
     * The cleanup itself, split out of [onDeleted] so it can be unit-tested: Robolectric has no
     * widget host, so Glance's own `super.onDeleted` fails asynchronously there and would swamp the
     * behaviour under test.
     */
    @VisibleForTesting
    internal fun clearInstanceConfiguration(
        context: Context,
        appWidgetIds: IntArray,
        // Injectable for the same reason the store's DataStore is: a test must not leave the
        // process-wide DataStore singleton running past the Robolectric application that made it.
        configurationStore: VoltraConfigurationStore = VoltraConfigurationStore(context),
    ) {
        try {
            runBlocking {
                configurationStore.clearInstances(widgetId, appWidgetIds.toList())
            }
        } catch (e: Exception) {
            Log.w(
                TAG,
                "Could not clear instance configuration for widget '$widgetId' " +
                    "(${appWidgetIds.joinToString()}): ${e.message}",
                e,
            )
        }
    }

    /**
     * The launcher restored its layout (device restore, launcher backup) and gave every placement a
     * new `appWidgetId`. Move each placement's instance configuration to its new id so a London
     * widget is still London after the restore instead of falling back to the widget-type values.
     * Same threading and failure rules as [onDeleted].
     */
    override fun onRestored(
        context: Context,
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
    ) {
        super.onRestored(context, oldWidgetIds, newWidgetIds)
        remapInstanceConfiguration(context, oldWidgetIds, newWidgetIds)
    }

    /** The remap itself, split out of [onRestored] for the same reason as [clearInstanceConfiguration]. */
    @VisibleForTesting
    internal fun remapInstanceConfiguration(
        context: Context,
        oldWidgetIds: IntArray,
        newWidgetIds: IntArray,
        configurationStore: VoltraConfigurationStore = VoltraConfigurationStore(context),
    ) {
        if (oldWidgetIds.size != newWidgetIds.size) {
            Log.w(
                TAG,
                "onRestored for '$widgetId' passed ${oldWidgetIds.size} old ids and ${newWidgetIds.size} new ids; skipping remap",
            )
            return
        }
        try {
            runBlocking {
                configurationStore.remapInstances(widgetId, oldWidgetIds.toList(), newWidgetIds.toList())
            }
        } catch (e: Exception) {
            Log.w(
                TAG,
                "Could not remap instance configuration for widget '$widgetId' " +
                    "(${oldWidgetIds.joinToString()} -> ${newWidgetIds.joinToString()}): ${e.message}",
                e,
            )
        }
    }
}
