package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.Dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.padding
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode

@Composable
fun VoltraLazyColumn(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val (baseModifier, compositeStyle) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
            element.p,
            element.i,
            context.widgetId,
            element.t,
            element.hashCode(),
        )
    val gap = compositeStyle?.layout?.gap

    LazyColumn(
        modifier = finalModifier,
        horizontalAlignment = extractHorizontalAlignment(element.p),
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                val count = children.elements.size
                items(count) { index ->
                    RenderLazyItem(children.elements[index], index, count, gap)
                }
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(children.ref)
                if (resolved is VoltraNode.Array) {
                    val count = resolved.elements.size
                    items(count) { index ->
                        RenderLazyItem(resolved.elements[index], index, count, gap)
                    }
                } else {
                    item { RenderNode(resolved) }
                }
            }

            null -> { /* Empty list */ }

            else -> {
                item { RenderNode(children) }
            }
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
