package voltra.dynamicwidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import voltra.widget.VoltraWidgetReceiver
import voltra.widget.VoltraWidgetReceivers

internal interface DynamicWidgetGlanceUpdateBoundary {
    fun getDynamicWidgetAppWidgetIds(dynamicWidgetReceiverComponentName: ComponentName): IntArray

    suspend fun getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId: Int): GlanceId

    suspend fun advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId: GlanceId)

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

    override suspend fun advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId: GlanceId) {
        updateAppWidgetState(context, dynamicWidgetGlanceId) { preferences ->
            val currentRevision = preferences[dynamicWidgetPropsRevisionKey] ?: 0L
            preferences[dynamicWidgetPropsRevisionKey] = currentRevision + 1L
        }
    }

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
        dynamicWidgetReceiverComponentName: ComponentName,
        dynamicWidgetId: String,
        dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
    ): Int {
        val validatedDynamicWidgetGlanceAppWidget =
            requireDynamicWidgetGlanceAppWidget(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
            )
        val dynamicWidgetAppWidgetIds =
            dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetAppWidgetIds(
                dynamicWidgetReceiverComponentName,
            )

        for (dynamicWidgetAppWidgetId in dynamicWidgetAppWidgetIds) {
            val dynamicWidgetGlanceId =
                dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId)
            dynamicWidgetGlanceUpdateBoundary.advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId)
            dynamicWidgetGlanceUpdateBoundary.updateDynamicWidget(
                dynamicWidgetGlanceAppWidget = validatedDynamicWidgetGlanceAppWidget,
                dynamicWidgetGlanceId = dynamicWidgetGlanceId,
            )
        }

        return dynamicWidgetAppWidgetIds.size
    }
}

private const val TAG = "DynamicWidgetGlanceUpdate"

/**
 * Narrows a possibly-payload-driven [GlanceAppWidget] to a [VoltraClientGlanceWidget], failing
 * loudly rather than silently no-op'ing when a payload-driven receiver's Glance instance is
 * handed to a Dynamic Widget update path by mistake.
 */
private fun requireDynamicWidgetGlanceAppWidget(
    dynamicWidgetId: String,
    dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
): VoltraClientGlanceWidget {
    require(dynamicWidgetGlanceAppWidget is VoltraClientGlanceWidget) {
        "Receiver for dynamicWidgetId=$dynamicWidgetId is not a Dynamic Widget receiver"
    }
    return dynamicWidgetGlanceAppWidget
}

/**
 * Trigger a Dynamic Widget Glance update and propagate lookup or update failures. Lives here
 * (rather than on [voltra.widget.VoltraWidgetReceiver]) so the shared base package never imports
 * this Dynamic-only package (ADR 0000).
 */
internal suspend fun triggerDynamicWidgetGlanceUpdate(
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
            dynamicWidgetGlanceAppWidget = VoltraWidgetReceiver.getWidget(context, dynamicWidgetId),
        )

    Log.d(
        TAG,
        "Triggered Dynamic Widget update for '$dynamicWidgetId' " +
            "($updatedDynamicWidgetInstanceCount instances)",
    )
}
