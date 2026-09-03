package voltra.dynamicwidget

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
}
