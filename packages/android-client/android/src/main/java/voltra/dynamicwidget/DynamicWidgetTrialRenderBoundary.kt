package voltra.dynamicwidget

import android.content.Context
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import voltra.models.VoltraNode
import voltra.widget.server.WidgetScope

/**
 * Renders a Dynamic Widget once, outside any composition, to find out whether some props render at
 * all.
 *
 * It lives here rather than in `voltra.dynamicwidget.serverupdate` because it needs the same
 * bundle evaluation and env construction the on-screen render uses, and neither is public. The
 * server-update engine calls it before committing fetched props.
 *
 * [configuration] is the trial's own responsibility to supply (ADR 0007): for an instance scope it
 * is that instance's merged configuration, not the type-level values, so a server response is
 * judged against the environment it will actually be drawn in. Callers with no instance of their
 * own pass the type-level configuration, which is what a plain [WidgetScope.Widget] trial render
 * wants — a suspend call can't be a default parameter value, so there is no implicit fallback here.
 *
 * @return the rendered node, or null when the bundle is not available or the render failed.
 */
internal suspend fun renderDynamicWidgetForTrial(
    context: Context,
    scope: WidgetScope,
    dynamicWidgetPropsJson: String,
    configuration: Map<String, String>,
): VoltraNode? {
    val dynamicWidgetId = scope.widgetId

    if (!VoltraClientGlanceWidget.ensureBundleEvaluated(context, dynamicWidgetId)) {
        // No bundle means every render fails, including the one already on screen. Rejecting the
        // props here would be blaming them for something they did not cause, and the widget falls
        // back to its prerendered initial state either way.
        return null
    }

    val environmentJson =
        VoltraClientGlanceWidget.buildTrialEnvJson(
            context = context,
            widgetId = dynamicWidgetId,
            size = trialSize(context, dynamicWidgetId),
            configuration = configuration,
        )

    return DynamicWidgetRenderCoordinator().renderDynamicWidget(
        dynamicWidgetId = dynamicWidgetId,
        dynamicWidgetRenderInput = DynamicWidgetRenderInput(propsRevision = 0L, propsJson = dynamicWidgetPropsJson),
        dynamicWidgetEnvironmentJson = environmentJson,
    )
}

/**
 * The size the trial render uses: the smallest placed instance if there is one, otherwise a
 * middling home screen widget. Picking a real placement matters because `env.widgetFamily` is how
 * a widget chooses its layout, and rendering a size the user does not have would test the wrong
 * branch.
 */
private fun trialSize(
    context: Context,
    dynamicWidgetId: String,
): DpSize {
    val placed = DynamicWidgetInstanceSizes.smallestPlacedSize(context, dynamicWidgetId)

    return placed ?: DpSize(FALLBACK_WIDTH_DP.dp, FALLBACK_HEIGHT_DP.dp)
}

private const val FALLBACK_WIDTH_DP = 180
private const val FALLBACK_HEIGHT_DP = 110
