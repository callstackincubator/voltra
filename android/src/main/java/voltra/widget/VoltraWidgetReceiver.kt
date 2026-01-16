package voltra.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

/**
 * Widget receiver for Voltra home screen widgets.
 * Handles widget lifecycle events and updates.
 */
class VoltraWidgetReceiver : GlanceAppWidgetReceiver() {
    
    override val glanceAppWidget: GlanceAppWidget = VoltraGlanceWidget()
}
