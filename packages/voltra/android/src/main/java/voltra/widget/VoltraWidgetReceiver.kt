package voltra.widget

import android.util.Log
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Base widget receiver for Voltra home screen widgets.
 * Handles widget lifecycle events and updates.
 *
 * Generated widget receivers extend this class and provide their widgetId.
 */
abstract class VoltraWidgetReceiver : GlanceAppWidgetReceiver() {
    companion object {
        private const val TAG = "VoltraWidgetReceiver"
    }

    /**
     * The unique identifier for this widget.
     * Must be provided by subclasses.
     */
    abstract val widgetId: String

    override val glanceAppWidget: GlanceAppWidget by lazy {
        Log.d(TAG, "Creating VoltraGlanceWidget for widgetId=$widgetId")
        VoltraGlanceWidget(widgetId)
    }
}
