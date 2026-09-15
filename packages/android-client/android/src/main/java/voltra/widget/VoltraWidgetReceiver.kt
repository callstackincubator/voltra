package voltra.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.os.Bundle
import android.util.Log
import androidx.annotation.VisibleForTesting
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import java.util.concurrent.ConcurrentHashMap

/**
 * Base widget receiver for Voltra home screen widgets.
 * Handles widget lifecycle events and updates.
 *
 * Generated widget receivers extend this class and provide their widgetId.
 */
abstract class VoltraWidgetReceiver : GlanceAppWidgetReceiver() {
    companion object {
        private const val TAG = "VoltraWidgetReceiver"
        private val widgetRegistry = ConcurrentHashMap<String, GlanceAppWidget>()

        /**
         * Get the registered GlanceAppWidget for a widgetId.
         * If not yet registered, tries to instantiate the receiver to populate the registry.
         */
        fun getWidget(
            context: Context,
            widgetId: String,
        ): GlanceAppWidget? {
            widgetRegistry[widgetId]?.let { return it }

            try {
                val receiverClassName = VoltraWidgetReceivers.className(context, widgetId)
                val receiverClass = Class.forName(receiverClassName)
                val receiver = receiverClass.getDeclaredConstructor().newInstance() as VoltraWidgetReceiver
                receiver.glanceAppWidget
                Log.d(TAG, "Instantiated receiver for '$widgetId' to populate registry")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to instantiate receiver for '$widgetId': ${e.message}", e)
            }

            return widgetRegistry[widgetId]
        }

        /**
         * Whether [widgetId] currently has a registered [GlanceAppWidget]. Exposed for tests to
         * assert that resolving a widget's kind ([VoltraWidgetKindResolver]) has no side effect on
         * this registry.
         */
        @VisibleForTesting
        internal fun isRegistered(widgetId: String): Boolean = widgetRegistry.containsKey(widgetId)

        /**
         * Trigger a Glance update for a specific widget using its registered instance.
         * This is the only reliable way to trigger provideGlance() from outside the receiver.
         */
        suspend fun triggerGlanceUpdate(
            context: Context,
            widgetId: String,
        ) {
            try {
                triggerGlanceUpdateOrThrow(context, widgetId)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to trigger update for '$widgetId': ${e.message}", e)
            }
        }

        /**
         * Trigger a Glance update for a specific glanceId using the registered widget.
         */
        suspend fun triggerGlanceUpdate(
            context: Context,
            widgetId: String,
            glanceId: GlanceId,
        ) {
            val widget = getWidget(context, widgetId)
            if (widget == null) {
                Log.w(TAG, "No registered widget for '$widgetId', cannot trigger update")
                return
            }

            try {
                widget.update(context, glanceId)
                Log.d(TAG, "Triggered update on registered widget '$widgetId' for specific glanceId")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to trigger update for '$widgetId': ${e.message}", e)
            }
        }

        /**
         * Trigger a Glance update for a specific widget using its registered instance, propagating
         * lookup or update failures to the caller instead of only logging them. Used where the
         * caller must surface the failure (e.g. rejecting a promise), unlike [triggerGlanceUpdate].
         */
        suspend fun triggerGlanceUpdateOrThrow(
            context: Context,
            widgetId: String,
        ) {
            val widget =
                getWidget(context, widgetId)
                    ?: error("No registered widget for '$widgetId', cannot trigger update")

            val manager = GlanceAppWidgetManager(context)
            val glanceIds = manager.getGlanceIds(widget.javaClass)
            for (glanceId in glanceIds) {
                widget.update(context, glanceId)
            }
            Log.d(TAG, "Triggered update on registered widget '$widgetId' (${glanceIds.size} instances)")
        }
    }

    /**
     * The unique identifier for this widget.
     * Must be provided by subclasses.
     */
    abstract val widgetId: String

    /**
     * The engine this receiver's widget belongs to (ADR 0000). Declared by the kind-specific base
     * class each generated receiver extends — [voltra.widget.payload.VoltraPayloadWidgetReceiver]
     * sets this to [VoltraWidgetKind.Payload], [voltra.dynamicwidget.VoltraClientWidgetReceiver]
     * to [VoltraWidgetKind.Dynamic]. Resolved by [VoltraWidgetKindResolver] before any cross-kind
     * write, so this must not be computed from [createGlanceAppWidget] or the registry. This base
     * package must not import either kind-specific package to supply a default here (ADR 0000).
     */
    abstract val widgetKind: VoltraWidgetKind

    /**
     * The GlanceAppWidget this receiver hosts. Supplied by the kind-specific base class each
     * generated receiver extends — [voltra.widget.payload.VoltraPayloadWidgetReceiver] returns
     * the server-rendered `VoltraGlanceWidget`, [voltra.dynamicwidget.VoltraClientWidgetReceiver]
     * returns `VoltraClientGlanceWidget`. Kept as a factory (not a direct property) so the shared
     * registry registration in [glanceAppWidget] stays in one place.
     */
    protected abstract fun createGlanceAppWidget(): GlanceAppWidget

    override val glanceAppWidget: GlanceAppWidget by lazy {
        Log.d(TAG, "Creating GlanceAppWidget for widgetId=$widgetId")
        val widget = createGlanceAppWidget()
        widgetRegistry[widgetId] = widget
        widget
    }

    /**
     * Called when the user resizes a widget on the home screen.
     */
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle,
    ) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)

        val w = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val h = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        Log.d(TAG, "Widget '$widgetId' resized to ${w}x$h")

        onWidgetResized(context)
    }

    /**
     * Re-render after a resize. No-op by default. [voltra.widget.payload.VoltraPayloadWidgetReceiver]
     * overrides this to re-render from cached data — the payload carries all size variants, so
     * `updateResponsiveAppWidget` picks the closest match; no network request needed. Dynamic
     * Widgets keep the no-op default: they use `SizeMode.Exact`, so Glance already re-composes
     * `provideGlance` for the new size (and there is no cached payload to re-render from).
     */
    protected open fun onWidgetResized(context: Context) = Unit
}
