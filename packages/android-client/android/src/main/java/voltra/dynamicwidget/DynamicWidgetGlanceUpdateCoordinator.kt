package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import voltra.widget.VoltraClientGlanceWidget
import voltra.widget.VoltraWidgetReceiver

internal interface DynamicWidgetGlanceUpdateBoundary {
    fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray

    suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId

    suspend fun updateDynamicWidget(
        dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
        dynamicWidgetGlanceId: GlanceId,
    )
}

internal class AndroidDynamicWidgetGlanceUpdateBoundary(
    private val context: Context,
) : DynamicWidgetGlanceUpdateBoundary {
    private val appWidgetManager by lazy { AppWidgetManager.getInstance(context) }
    private val glanceAppWidgetManager by lazy { GlanceAppWidgetManager(context) }

    override fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray =
        appWidgetManager.getAppWidgetIds(dynamicWidgetReceiverComponentName)

    override suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId =
        glanceAppWidgetManager.getGlanceIdBy(dynamicWidgetAppWidgetId)

    override suspend fun updateDynamicWidget(
        dynamicWidgetGlanceAppWidget: VoltraClientGlanceWidget,
        dynamicWidgetGlanceId: GlanceId,
    ) {
        dynamicWidgetGlanceAppWidget.update(context, dynamicWidgetGlanceId)
    }
}

internal class DynamicWidgetGlanceUpdateCoordinator(
    private val dynamicWidgetGlanceUpdateBoundary: DynamicWidgetGlanceUpdateBoundary,
) {
    suspend fun triggerDynamicWidgetGlanceUpdate(
        packageName: String,
        dynamicWidgetId: String,
        dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
    ): Int {
        val validatedDynamicWidgetGlanceAppWidget =
            VoltraWidgetReceiver.requireDynamicWidgetGlanceAppWidget(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
            )
        val dynamicWidgetReceiverClassName =
            "$packageName.widget.VoltraWidget_${dynamicWidgetId}Receiver"
        val dynamicWidgetReceiverComponentName =
            ComponentName(packageName, dynamicWidgetReceiverClassName)
        val dynamicWidgetAppWidgetIds =
            dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetAppWidgetIds(
                dynamicWidgetReceiverComponentName,
            )

        for (dynamicWidgetAppWidgetId in dynamicWidgetAppWidgetIds) {
            val dynamicWidgetGlanceId =
                dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId)
            dynamicWidgetGlanceUpdateBoundary.updateDynamicWidget(
                dynamicWidgetGlanceAppWidget = validatedDynamicWidgetGlanceAppWidget,
                dynamicWidgetGlanceId = dynamicWidgetGlanceId,
            )
        }

        return dynamicWidgetAppWidgetIds.size
    }
}
