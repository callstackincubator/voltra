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

    suspend fun advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId: GlanceId)

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

    override suspend fun advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId: GlanceId) {
        updateAppWidgetState(context, dynamicWidgetGlanceId) { preferences ->
            val currentRevision = preferences[dynamicWidgetConfigurationRevisionKey] ?: 0L
            preferences[dynamicWidgetConfigurationRevisionKey] = currentRevision + 1L
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

    /**
     * One placement's configuration changed: advance that placement's configuration revision and
     * re-render only it, leaving sibling placements of the same widget untouched.
     */
    suspend fun triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
        dynamicWidgetAppWidgetId: Int,
        dynamicWidgetId: String,
        dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
    ) {
        val validatedDynamicWidgetGlanceAppWidget =
            requireDynamicWidgetGlanceAppWidget(
                dynamicWidgetId = dynamicWidgetId,
                dynamicWidgetGlanceAppWidget = dynamicWidgetGlanceAppWidget,
            )
        val dynamicWidgetGlanceId =
            dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId)
        dynamicWidgetGlanceUpdateBoundary.advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId)
        dynamicWidgetGlanceUpdateBoundary.updateDynamicWidget(
            dynamicWidgetGlanceAppWidget = validatedDynamicWidgetGlanceAppWidget,
            dynamicWidgetGlanceId = dynamicWidgetGlanceId,
        )
    }

    /**
     * The instance-scoped counterpart of [triggerDynamicWidgetGlanceUpdate] (ADR 0007): a committed
     * per-instance server fetch re-renders only the placements [includeAppWidgetId] selects, leaving
     * placements of other configurations untouched.
     */
    suspend fun triggerDynamicWidgetGlanceUpdateForPlacements(
        dynamicWidgetReceiverComponentName: ComponentName,
        dynamicWidgetId: String,
        dynamicWidgetGlanceAppWidget: GlanceAppWidget?,
        includeAppWidgetId: suspend (Int) -> Boolean,
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

        var updated = 0
        for (dynamicWidgetAppWidgetId in dynamicWidgetAppWidgetIds) {
            if (!includeAppWidgetId(dynamicWidgetAppWidgetId)) continue

            val dynamicWidgetGlanceId =
                dynamicWidgetGlanceUpdateBoundary.getDynamicWidgetGlanceId(dynamicWidgetAppWidgetId)
            dynamicWidgetGlanceUpdateBoundary.advanceDynamicWidgetPropsRevision(dynamicWidgetGlanceId)
            dynamicWidgetGlanceUpdateBoundary.updateDynamicWidget(
                dynamicWidgetGlanceAppWidget = validatedDynamicWidgetGlanceAppWidget,
                dynamicWidgetGlanceId = dynamicWidgetGlanceId,
            )
            updated++
        }

        return updated
    }

    /**
     * The configuration counterpart of [triggerDynamicWidgetGlanceUpdate]: advance every
     * placement's configuration revision before updating it, so a widget whose Glance session is
     * still alive re-reads the store instead of redrawing the values it captured when its session
     * began.
     */
    suspend fun triggerDynamicWidgetConfigurationGlanceUpdate(
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
            dynamicWidgetGlanceUpdateBoundary.advanceDynamicWidgetConfigurationRevision(dynamicWidgetGlanceId)
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

/**
 * Re-render every placement of a Dynamic Widget after a widget-type configuration write, advancing
 * each one's configuration revision first. Lives here (rather than on
 * [voltra.widget.VoltraWidgetReceiver]) so the shared base package never imports this Dynamic-only
 * package (ADR 0000).
 */
internal suspend fun triggerDynamicWidgetConfigurationGlanceUpdate(
    context: Context,
    dynamicWidgetId: String,
) {
    val updatedDynamicWidgetInstanceCount =
        DynamicWidgetGlanceUpdateCoordinator(
            AndroidDynamicWidgetGlanceUpdateBoundary(context),
        ).triggerDynamicWidgetConfigurationGlanceUpdate(
            dynamicWidgetReceiverComponentName =
                VoltraWidgetReceivers.componentName(context, dynamicWidgetId),
            dynamicWidgetId = dynamicWidgetId,
            dynamicWidgetGlanceAppWidget = VoltraWidgetReceiver.getWidget(context, dynamicWidgetId),
        )

    Log.d(
        TAG,
        "Triggered Dynamic Widget configuration update for '$dynamicWidgetId' " +
            "($updatedDynamicWidgetInstanceCount instances)",
    )
}

/**
 * Re-render only the placements [includeAppWidgetId] selects, advancing their props revision first
 * (ADR 0007: a committed per-instance server fetch re-renders only placements with a matching
 * configuration key). Lives here, rather than in `voltra.dynamicwidget.serverupdate`, so the update
 * boundary is built once, in the same place the other trigger functions build it.
 */
internal suspend fun triggerDynamicWidgetGlanceUpdateForPlacements(
    context: Context,
    dynamicWidgetId: String,
    includeAppWidgetId: suspend (Int) -> Boolean,
) {
    val updatedDynamicWidgetInstanceCount =
        DynamicWidgetGlanceUpdateCoordinator(
            AndroidDynamicWidgetGlanceUpdateBoundary(context),
        ).triggerDynamicWidgetGlanceUpdateForPlacements(
            dynamicWidgetReceiverComponentName =
                VoltraWidgetReceivers.componentName(context, dynamicWidgetId),
            dynamicWidgetId = dynamicWidgetId,
            dynamicWidgetGlanceAppWidget = VoltraWidgetReceiver.getWidget(context, dynamicWidgetId),
            includeAppWidgetId = includeAppWidgetId,
        )

    Log.d(
        TAG,
        "Triggered Dynamic Widget update for '$dynamicWidgetId' " +
            "($updatedDynamicWidgetInstanceCount matching instances)",
    )
}

/**
 * Advance one placement's configuration revision and re-render just that placement, for a
 * per-instance configuration write.
 */
internal suspend fun triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
    context: Context,
    dynamicWidgetId: String,
    dynamicWidgetAppWidgetId: Int,
) {
    DynamicWidgetGlanceUpdateCoordinator(
        AndroidDynamicWidgetGlanceUpdateBoundary(context),
    ).triggerDynamicWidgetInstanceConfigurationGlanceUpdate(
        dynamicWidgetAppWidgetId = dynamicWidgetAppWidgetId,
        dynamicWidgetId = dynamicWidgetId,
        dynamicWidgetGlanceAppWidget = VoltraWidgetReceiver.getWidget(context, dynamicWidgetId),
    )

    Log.d(TAG, "Triggered configuration update for '$dynamicWidgetId' instance $dynamicWidgetAppWidgetId")
}
