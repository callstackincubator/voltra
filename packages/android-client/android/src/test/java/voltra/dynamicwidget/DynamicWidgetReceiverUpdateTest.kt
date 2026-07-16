package voltra.dynamicwidget

import org.junit.Assert.assertSame
import org.junit.Assert.assertThrows
import org.junit.Test
import voltra.widget.VoltraClientGlanceWidget
import voltra.widget.VoltraGlanceWidget
import voltra.widget.VoltraWidgetReceiver

class DynamicWidgetReceiverUpdateTest {
    @Test
    fun acceptsADynamicWidgetReceiverGlanceInstance() {
        val dynamicWidgetGlanceAppWidget = VoltraClientGlanceWidget("dynamic-widget")

        val resolvedDynamicWidgetGlanceAppWidget =
            VoltraWidgetReceiver.requireDynamicWidgetGlanceAppWidget(
                dynamicWidgetId = "dynamic-widget",
                dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
            )

        assertSame(dynamicWidgetGlanceAppWidget, resolvedDynamicWidgetGlanceAppWidget)
    }

    @Test
    fun rejectsALegacyWidgetReceiverGlanceInstance() {
        assertThrows(IllegalArgumentException::class.java) {
            VoltraWidgetReceiver.requireDynamicWidgetGlanceAppWidget(
                dynamicWidgetId = "legacy-widget",
                dynamicWidgetGlanceAppWidget = VoltraGlanceWidget("legacy-widget"),
            )
        }
    }
}
