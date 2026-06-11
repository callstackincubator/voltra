package voltra.widget

import androidx.glance.appwidget.GlanceAppWidget

/**
 * Base receiver for client-rendered Voltra widgets. Identical lifecycle to
 * [VoltraWidgetReceiver] but hosts a [VoltraClientGlanceWidget] (on-device JS render) instead
 * of the server-rendered [VoltraGlanceWidget].
 *
 * Generated client receivers extend this and provide their `widgetId`.
 */
abstract class VoltraClientWidgetReceiver : VoltraWidgetReceiver() {
    override fun createGlanceAppWidget(): GlanceAppWidget = VoltraClientGlanceWidget(widgetId)
}
