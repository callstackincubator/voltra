package voltra.widget.payload

import android.content.Context
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import voltra.widget.VoltraWidgetKind
import voltra.widget.VoltraWidgetReceiver

/**
 * Base receiver for payload-driven (server-rendered) Voltra widgets (ADR 0000). Owns the
 * defaults [VoltraWidgetReceiver] used to host directly: the [VoltraGlanceWidget] factory, the
 * [VoltraWidgetKind.Payload] kind, and the resize re-render (the payload carries all size
 * variants, so a resize just re-renders from cached data via [VoltraWidgetManager.updateWidgetDirect] -
 * no network request needed).
 *
 * Generated payload-driven widget receivers extend this and provide their `widgetId`.
 */
abstract class VoltraPayloadWidgetReceiver : VoltraWidgetReceiver() {
    override val widgetKind: VoltraWidgetKind = VoltraWidgetKind.Payload

    override fun createGlanceAppWidget(): GlanceAppWidget = VoltraGlanceWidget(widgetId)

    override fun onWidgetResized(context: Context) {
        CoroutineScope(Dispatchers.IO).launch {
            val widgetManager = VoltraWidgetManager(context.applicationContext)
            widgetManager.updateWidgetDirect(widgetId)
        }
    }
}
