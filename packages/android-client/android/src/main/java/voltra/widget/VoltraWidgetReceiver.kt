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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import voltra.dynamicwidget.AndroidDynamicWidgetGlanceUpdateBoundary
import voltra.dynamicwidget.DynamicWidgetGlanceUpdateCoordinator
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

        internal fun requireDynamicWidgetGlanceAppWidget(
            dynamicWidgetId: String,
            dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
        ): VoltraClientGlanceWidget {
            require(dynamicWidgetGlanceAppWidget is VoltraClientGlanceWidget) {
                "Receiver for dynamicWidgetId=$dynamicWidgetId is not a Dynamic Widget receiver"
            }
            return dynamicWidgetGlanceAppWidget
        }

        /** Trigger a Dynamic Widget Glance update and propagate lookup or update failures. */
        suspend fun triggerDynamicWidgetGlanceUpdate(
            context: Context,
            dynamicWidgetId: String,
        ) {
            val updatedDynamicWidgetInstanceCount =
                DynamicWidgetGlanceUpdateCoordinator(
                    AndroidDynamicWidgetGlanceUpdateBoundary(context),
                ).triggerDynamicWidgetGlanceUpdate(
                    dynamicWidgetReceiverComponentName =
                        VoltraWidgetReceivers.componentName(context, dynamicWidgetId),
                    dynamicWidgetId = dynamicWidgetId,
                    dynamicWidgetGlanceAppWidget = getWidget(context, dynamicWidgetId),
                )

            Log.d(
                TAG,
                "Triggered Dynamic Widget update for '$dynamicWidgetId' " +
                    "($updatedDynamicWidgetInstanceCount instances)",
            )
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
     * The engine this receiver's widget belongs to (ADR 0000). Defaults to [VoltraWidgetKind.Payload]
     * since this base class hosts the server-rendered [VoltraGlanceWidget] by default;
     * [VoltraClientWidgetReceiver] overrides this to [VoltraWidgetKind.Dynamic]. Resolved by
     * [VoltraWidgetKindResolver] before any cross-kind write, so this must not be computed from
     * [createGlanceAppWidget] or the registry.
     */
    open val widgetKind: VoltraWidgetKind = VoltraWidgetKind.Payload

    /**
     * The GlanceAppWidget this receiver hosts. Defaults to the server-rendered
     * [VoltraGlanceWidget]; Dynamic Widget receivers override this to return a
     * [voltra.widget.VoltraClientGlanceWidget]. Kept as a factory (not a direct property) so
     * the shared registry registration in [glanceAppWidget] stays in one place.
     */
    protected open fun createGlanceAppWidget(): GlanceAppWidget = VoltraGlanceWidget(widgetId)

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
     * Re-render after a resize. Server-rendered widgets re-render from cached data — the payload
     * carries all size variants, so [updateResponsiveAppWidget] picks the closest match; no
     * network request needed. Client-rendered widgets override this to no-op: they use
     * `SizeMode.Exact`, so Glance already re-composes `provideGlance` for the new size (and there
     * is no cached payload to re-render from).
     */
    protected open fun onWidgetResized(context: Context) {
        CoroutineScope(Dispatchers.IO).launch {
            val widgetManager = VoltraWidgetManager(context.applicationContext)
            widgetManager.updateWidgetDirect(widgetId)
        }
    }
}
