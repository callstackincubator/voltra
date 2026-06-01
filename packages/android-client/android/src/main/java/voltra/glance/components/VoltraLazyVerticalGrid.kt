package voltra.glance.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.GridCells
import androidx.glance.appwidget.lazy.LazyVerticalGrid
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement
import voltra.models.VoltraNode

@Composable
fun VoltraLazyVerticalGrid(
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

    LazyVerticalGrid(
        gridCells = extractGridCells(element.p),
        modifier = finalModifier,
        horizontalAlignment = extractHorizontalAlignment(element.p),
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

private fun extractGridCells(props: Map<String, Any?>?): GridCells =
    when (val columns = props?.get("columns")) {
        is Number -> {
            GridCells.Fixed(columns.toInt().coerceAtLeast(1))
        }

        is String -> {
            val adaptiveMinSize = if (columns.startsWith("a:")) columns.substringAfter("a:").toIntOrNull() else null
            if (adaptiveMinSize != null) {
                GridCells.Adaptive(adaptiveMinSize.coerceAtLeast(1).dp)
            } else {
                GridCells.Fixed(2)
            }
        }

        else -> {
            GridCells.Fixed(2)
        }
    }
