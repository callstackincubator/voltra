package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.padding
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.glance.resolveElementStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode

@Composable
fun VoltraLazyColumn(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: resolveAndApplyStyle(element, context.sharedStyles).modifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )
    val horizontalAlignment = extractHorizontalAlignment(element.p)
    val gap = resolveElementStyle(element, context.sharedStyles)?.layout?.gap
    val items =
        LayoutGaps.visibleItems(
            resolveLazyListItems(element.c, context.sharedElements),
            gap,
            context.sharedStyles,
            context.sharedElements,
        )

    // On API 31 and below (see VoltraRN.usesAppWidgetHostView), Glance delivers LazyColumn's items through GlanceRemoteViewsService,
    // which the framework binds via AppWidgetManager.bindRemoteViewsService — that requires a
    // real widget id bound to the caller's AppWidgetHost, which no in-app preview can provide
    // (see VoltraRN.kt). Render the items eagerly there instead so the preview shows content.
    if (context.eagerLazyLists) {
        Column(
            modifier = finalModifier,
            horizontalAlignment = horizontalAlignment,
        ) {
            RenderNestedGroups(items.withIndex().toList(), horizontalAlignment) { (index, child) ->
                LazyItemBox(horizontalAlignment) { RenderLazyItem(child, index, items.size, gap) }
            }
        }
        return
    }

    LazyColumn(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
    ) {
        items(items.size) { index ->
            RenderLazyItem(items[index], index, items.size, gap)
        }
    }
}

/**
 * Renders one lazy-list item, padding its bottom edge to simulate the `gap` style
 * between items without changing the item count or its implicit id.
 */
@Composable
internal fun RenderLazyItem(
    node: VoltraNode?,
    index: Int,
    itemCount: Int,
    gap: Dp?,
) {
    if (LayoutGaps.shouldPadTrailing(index, itemCount, gap)) {
        Box(modifier = GlanceModifier.padding(bottom = gap!!)) {
            RenderNode(node)
        }
    } else {
        RenderNode(node)
    }
}

internal fun extractHorizontalAlignment(props: Map<String, Any?>?): Alignment.Horizontal =
    when (props?.get("horizontalAlignment") as? String) {
        "start" -> Alignment.Horizontal.Start
        "center-horizontally" -> Alignment.Horizontal.CenterHorizontally
        "end" -> Alignment.Horizontal.End
        else -> Alignment.Horizontal.Start
    }
