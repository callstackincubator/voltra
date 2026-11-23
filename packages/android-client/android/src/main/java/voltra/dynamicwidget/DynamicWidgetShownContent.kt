package voltra.dynamicwidget

import voltra.models.VoltraNode

/** What a Dynamic Widget placement draws (ADR 0013, section 3). */
internal sealed interface DynamicWidgetShownContent {
    /** A node to hand to the Glance renderer: the live render, the last good one or the placeholder. */
    data class Node(
        val node: VoltraNode,
    ) : DynamicWidgetShownContent

    /** The dev error view. Composed from plain Glance primitives, never from a [VoltraNode]. */
    data class DevError(
        val failure: DynamicWidgetRenderOutcome.Failure,
    ) : DynamicWidgetShownContent

    /** Nothing to show: no live render, no last good render and no placeholder. */
    data object Loading : DynamicWidgetShownContent
}

/**
 * Everything `Content` decides before it draws, as one plain function so it can be tested without a
 * composition (ADR 0013). One rule, with no configuration: loud in dev, graceful in release.
 *
 * - A bundle that failed to load is the outcome, and [render] is not called; otherwise [render]
 *   runs and its outcome is the one used.
 * - The outcome is logged, and a successful node is written to [lastGoodStore] in every build, so
 *   dev runs exercise the write path even though only release reads it back.
 * - A successful render is always shown.
 * - A failure in a debuggable build is shown as the dev error view, even when a last good render or
 *   a placeholder exists, because hiding it behind plausible content is the bug this fixes.
 * - A failure in a release build keeps the last good render of this placement at this [family],
 *   else the placeholder, else [DynamicWidgetShownContent.Loading].
 *
 * [family] is `env.widgetFamily`: Glance composes `Content` once per size a placement reports, so
 * the last good render, and the failure log, are kept per size. A placement whose [appWidgetId]
 * could not be resolved has no last good render, in either direction.
 *
 * The last good render and the placeholder are only touched on a failure: they hit disk and the
 * asset decoder, and the success path needs neither.
 */
internal fun resolveDynamicWidgetContent(
    widgetId: String,
    appWidgetId: Int?,
    family: String,
    isDev: Boolean,
    bundleState: DynamicWidgetBundleState,
    render: () -> DynamicWidgetRenderOutcome,
    lastGoodStore: DynamicWidgetLastGoodStore,
    parseNode: (String) -> VoltraNode?,
    placeholder: () -> VoltraNode?,
): DynamicWidgetShownContent {
    val outcome =
        when (bundleState) {
            is DynamicWidgetBundleState.Ready -> render()
            is DynamicWidgetBundleState.Failed -> bundleState.failure
        }

    return when (outcome) {
        is DynamicWidgetRenderOutcome.Success -> {
            DynamicWidgetFailureLog.succeeded(widgetId, appWidgetId, family)
            if (appWidgetId != null) {
                lastGoodStore.write(widgetId, appWidgetId, family, outcome.nodeJson)
            }
            DynamicWidgetShownContent.Node(outcome.node)
        }

        is DynamicWidgetRenderOutcome.Failure -> {
            DynamicWidgetFailureLog.failed(widgetId, appWidgetId, family, outcome, isDev)
            if (isDev) {
                DynamicWidgetShownContent.DevError(outcome)
            } else {
                val lastGood =
                    appWidgetId?.let { lastGoodStore.read(widgetId, it, family) }?.let(parseNode)
                (lastGood ?: placeholder())?.let { DynamicWidgetShownContent.Node(it) }
                    ?: DynamicWidgetShownContent.Loading
            }
        }
    }
}
