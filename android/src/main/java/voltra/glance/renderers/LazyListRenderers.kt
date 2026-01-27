package voltra.glance.renderers

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.GridCells
import androidx.glance.appwidget.lazy.LazyColumn
import androidx.glance.appwidget.lazy.LazyVerticalGrid
import androidx.glance.layout.Alignment
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode

@Composable
fun RenderLazyColumn(
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

    // Extract props
    val horizontalAlignment = extractHorizontalAlignment(element.p)

    LazyColumn(
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                items(children.elements.size) { index ->
                    RenderNode(children.elements[index])
                }
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(children.ref)
                if (resolved is VoltraNode.Array) {
                    items(resolved.elements.size) { index ->
                        RenderNode(resolved.elements[index])
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

@Composable
fun RenderLazyVerticalGrid(
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

    // Extract grid configuration from props
    val gridCells =
        when (val columns = element.p?.get("columns")) {
            is Number -> {
                GridCells.Fixed(columns.toInt())
            }

            "adaptive" -> {
                val minSize = (element.p?.get("minSize") as? Number)?.toInt() ?: 100
                GridCells.Adaptive(minSize.dp)
            }

            else -> {
                GridCells.Fixed(2)
            } // Default to 2 columns
        }

    val horizontalAlignment = extractHorizontalAlignment(element.p)

    LazyVerticalGrid(
        gridCells = gridCells,
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                items(children.elements.size) { index ->
                    RenderNode(children.elements[index])
                }
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(children.ref)
                if (resolved is VoltraNode.Array) {
                    items(resolved.elements.size) { index ->
                        RenderNode(resolved.elements[index])
                    }
                } else {
                    item { RenderNode(resolved) }
                }
            }

            null -> { /* Empty grid */ }

            else -> {
                item { RenderNode(children) }
            }
        }
    }
}

private fun extractHorizontalAlignment(props: Map<String, Any>?): Alignment.Horizontal =
    when (props?.get("horizontalAlignment") as? String) {
        "start" -> Alignment.Horizontal.Start
        "center-horizontally" -> Alignment.Horizontal.CenterHorizontally
        "end" -> Alignment.Horizontal.End
        else -> Alignment.Horizontal.Start
    }

private fun extractVerticalAlignment(props: Map<String, Any>?): Alignment.Vertical =
    when (props?.get("verticalAlignment") as? String) {
        "top" -> Alignment.Vertical.Top
        "center" -> Alignment.Vertical.CenterVertically
        "bottom" -> Alignment.Vertical.Bottom
        else -> Alignment.Vertical.Top
    }
