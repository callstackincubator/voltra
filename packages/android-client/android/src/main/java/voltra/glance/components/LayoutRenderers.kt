package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.layout.*
import androidx.glance.text.Text
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.VoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderElementWithModifier
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.glance.resolveElementStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.styling.applyFlex

/**
 * Computes the leaf children a Column/Row should render.
 *
 * Gone children are always filtered out before gaps are calculated. On Android 11 and
 * older, Glance can wrap a view with a fixed dp width or height in a size-holding
 * container; `Visibility.Gone` hides the inner view but leaves that wrapper in the layout.
 */
private fun resolveGapChildren(
    element: VoltraElement,
    context: VoltraRenderContext,
): List<VoltraNode> {
    val allChildren = LayoutGaps.flattenChildren(element.c, context.sharedElements)
    return LayoutGaps.visibleChildren(allChildren, context.sharedStyles)
}

@Composable
fun RenderColumn(
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

    val horizontalAlignment =
        when (element.p?.get("horizontalAlignment") as? String) {
            "start" -> Alignment.Horizontal.Start
            "center-horizontally" -> Alignment.Horizontal.CenterHorizontally
            "end" -> Alignment.Horizontal.End
            else -> Alignment.Horizontal.Start
        }

    val verticalAlignment =
        when (element.p?.get("verticalAlignment") as? String) {
            "top" -> Alignment.Vertical.Top
            "center-vertically" -> Alignment.Vertical.CenterVertically
            "bottom" -> Alignment.Vertical.Bottom
            else -> Alignment.Vertical.Top
        }

    val gap = resolveElementStyle(element, context.sharedStyles)?.layout?.gap
    val visibleChildren = resolveGapChildren(element, context)

    Column(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
        verticalAlignment = verticalAlignment,
    ) {
        visibleChildren.forEachIndexed { index, child ->
            val insets = LayoutGaps.gapInsets(index, visibleChildren.size, gap)
            if (insets != null) {
                RenderChildWithGap(child, insets)
            } else {
                RenderChildWithWeight(child)
            }
        }
    }
}

@Composable
fun RenderRow(
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

    val horizontalAlignment =
        when (element.p?.get("horizontalAlignment") as? String) {
            "start" -> Alignment.Horizontal.Start
            "center-horizontally" -> Alignment.Horizontal.CenterHorizontally
            "end" -> Alignment.Horizontal.End
            else -> Alignment.Horizontal.Start
        }

    val verticalAlignment =
        when (element.p?.get("verticalAlignment") as? String) {
            "top" -> Alignment.Vertical.Top
            "center-vertically" -> Alignment.Vertical.CenterVertically
            "bottom" -> Alignment.Vertical.Bottom
            else -> Alignment.Vertical.CenterVertically
        }

    val gap = resolveElementStyle(element, context.sharedStyles)?.layout?.gap
    val visibleChildren = resolveGapChildren(element, context)

    Row(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
        verticalAlignment = verticalAlignment,
    ) {
        visibleChildren.forEachIndexed { index, child ->
            val insets = LayoutGaps.gapInsets(index, visibleChildren.size, gap)
            if (insets != null) {
                RenderChildWithGap(child, insets)
            } else {
                RenderChildWithWeight(child)
            }
        }
    }
}

@Composable
fun RenderBox(
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

    val contentAlignment =
        when (element.p?.get("contentAlignment") as? String) {
            "top-start" -> Alignment.TopStart
            "top-center" -> Alignment.TopCenter
            "top-end" -> Alignment.TopEnd
            "center-start" -> Alignment.CenterStart
            "center" -> Alignment.Center
            "center-end" -> Alignment.CenterEnd
            "bottom-start" -> Alignment.BottomStart
            "bottom-center" -> Alignment.BottomCenter
            "bottom-end" -> Alignment.BottomEnd
            else -> Alignment.TopStart
        }

    Box(
        modifier = finalModifier,
        contentAlignment = contentAlignment,
    ) {
        RenderNode(element.c)
    }
}

@Composable
fun RenderSpacer(
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
    Spacer(modifier = finalModifier)
}

// Helper extension functions for scope-dependent rendering

@Composable
private fun ColumnScope.RenderChildWithWeight(child: VoltraNode?) {
    if (child == null) return

    val context = LocalVoltraRenderContext.current
    val weight = extractWeightFromChild(child, context)

    when (child) {
        is VoltraNode.Element -> {
            val (baseModifier, compositeStyle) = resolveAndApplyStyle(child.element, context.sharedStyles)
            val finalModifier = applyFlex(baseModifier, weight)
            RenderElementWithModifier(child.element, finalModifier, compositeStyle)
        }

        is VoltraNode.Array -> {
            child.elements.forEach { RenderChildWithWeight(it) }
        }

        is VoltraNode.Ref -> {
            val resolved = context.sharedElements?.getOrNull(child.ref)
            RenderChildWithWeight(resolved)
        }

        is VoltraNode.Text -> {
            Text(child.text)
        }
    }
}

@Composable
private fun RowScope.RenderChildWithWeight(child: VoltraNode?) {
    if (child == null) return

    val context = LocalVoltraRenderContext.current
    val weight = extractWeightFromChild(child, context)

    when (child) {
        is VoltraNode.Element -> {
            val (baseModifier, compositeStyle) = resolveAndApplyStyle(child.element, context.sharedStyles)
            val finalModifier = applyFlex(baseModifier, weight)
            RenderElementWithModifier(child.element, finalModifier, compositeStyle)
        }

        is VoltraNode.Array -> {
            child.elements.forEach { RenderChildWithWeight(it) }
        }

        is VoltraNode.Ref -> {
            val resolved = context.sharedElements?.getOrNull(child.ref)
            RenderChildWithWeight(resolved)
        }

        is VoltraNode.Text -> {
            Text(child.text)
        }
    }
}

/**
 * Renders a leaf child of a Column that has the `gap` style.
 *
 * The gap is top/bottom padding on a `Box` wrapping the child (see [LayoutGaps.gapInsets])
 * instead of a separate `Spacer`, so it does not use up one of Glance's 10 direct-child
 * slots, and it sits outside the child's own background. A weighted child moves its weight
 * to the wrapper and fills it, so it still takes its share of the Column's free space.
 */
@Composable
private fun ColumnScope.RenderChildWithGap(
    child: VoltraNode,
    insets: LayoutGaps.GapInsets,
) {
    val context = LocalVoltraRenderContext.current
    val weighted = (extractWeightFromChild(child, context) ?: 0f) > 0f
    val wrapper = GlanceModifier.padding(top = insets.leading, bottom = insets.trailing)
    Box(modifier = applyFlex(wrapper, if (weighted) 1f else null)) {
        RenderGapWrappedChild(child) { if (weighted) it.fillMaxHeight() else it }
    }
}

/**
 * Renders a leaf child of a Row that has the `gap` style. See the Column overload; the gap
 * is start/end padding here, so it follows the layout direction.
 */
@Composable
private fun RowScope.RenderChildWithGap(
    child: VoltraNode,
    insets: LayoutGaps.GapInsets,
) {
    val context = LocalVoltraRenderContext.current
    val weighted = (extractWeightFromChild(child, context) ?: 0f) > 0f
    val wrapper = GlanceModifier.padding(start = insets.leading, end = insets.trailing)
    Box(modifier = applyFlex(wrapper, if (weighted) 1f else null)) {
        RenderGapWrappedChild(child) { if (weighted) it.fillMaxWidth() else it }
    }
}

@Composable
private fun RenderGapWrappedChild(
    child: VoltraNode,
    fillWeightedAxis: (GlanceModifier) -> GlanceModifier,
) {
    val context = LocalVoltraRenderContext.current
    when (child) {
        is VoltraNode.Element -> {
            val (baseModifier, compositeStyle) = resolveAndApplyStyle(child.element, context.sharedStyles)
            RenderElementWithModifier(child.element, fillWeightedAxis(baseModifier), compositeStyle)
        }

        is VoltraNode.Text -> {
            Text(child.text)
        }

        // Column/Row children are flattened to Element and Text leaves before rendering.
        else -> {
            RenderNode(child)
        }
    }
}

private fun extractWeightFromChild(
    child: VoltraNode?,
    context: voltra.glance.VoltraRenderContext,
): Float? {
    val element =
        when (child) {
            is VoltraNode.Element -> {
                child.element
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(child.ref)
                if (resolved is VoltraNode.Element) resolved.element else null
            }

            else -> {
                null
            }
        } ?: return null

    // Style only: the child's own renderer builds its modifiers.
    return resolveElementStyle(element, context.sharedStyles)?.layout?.weight
}
