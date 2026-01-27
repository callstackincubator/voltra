package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.layout.*
import androidx.glance.text.Text
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.VoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode
import voltra.styling.applyFlex

@Composable
fun RenderColumn(
    element: VoltraElement,
    modifier: GlanceModifier? = null,
) {
    val context = LocalVoltraRenderContext.current
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
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

    Column(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
        verticalAlignment = verticalAlignment,
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                children.elements.forEach { child ->
                    RenderChildWithWeight(child)
                }
            }

            else -> {
                RenderChildWithWeight(children)
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
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
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

    Row(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
        verticalAlignment = verticalAlignment,
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                children.elements.forEach { child ->
                    RenderChildWithWeight(child)
                }
            }

            else -> {
                RenderChildWithWeight(children)
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
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
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
    val (baseModifier, _) = resolveAndApplyStyle(element.p, context.sharedStyles)
    val finalModifier =
        applyClickableIfNeeded(
            modifier ?: baseModifier,
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
            val (baseModifier, compositeStyle) = resolveAndApplyStyle(child.element.p, context.sharedStyles)
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
            val (baseModifier, compositeStyle) = resolveAndApplyStyle(child.element.p, context.sharedStyles)
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

    val (_, compositeStyle) = resolveAndApplyStyle(element.p, context.sharedStyles)
    return compositeStyle?.layout?.weight
}
