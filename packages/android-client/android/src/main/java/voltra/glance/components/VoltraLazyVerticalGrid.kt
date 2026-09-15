package voltra.glance.components

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.GridCells
import androidx.glance.appwidget.lazy.LazyVerticalGrid
import androidx.glance.layout.Box
import androidx.glance.layout.padding
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
    // Wrap every cell in a half-gap padding: this gives a full gap between adjacent cells
    // and a half gap at the outer edge of the grid.
    val gap = compositeStyle?.layout?.gap
    val cellPadding = gap?.takeIf { it.value > 0f }?.let { it / 2 }

    LazyVerticalGrid(
        gridCells = extractGridCells(element.p),
        modifier = finalModifier,
        horizontalAlignment = extractHorizontalAlignment(element.p),
    ) {
        when (val children = element.c) {
            is VoltraNode.Array -> {
                items(children.elements.size) { index ->
                    RenderGridCell(children.elements[index], cellPadding)
                }
            }

            is VoltraNode.Ref -> {
                val resolved = context.sharedElements?.getOrNull(children.ref)
                if (resolved is VoltraNode.Array) {
                    items(resolved.elements.size) { index ->
                        RenderGridCell(resolved.elements[index], cellPadding)
                    }
                } else {
                    item { RenderGridCell(resolved, cellPadding) }
                }
            }

            null -> { /* Empty grid */ }

            else -> {
                item { RenderGridCell(children, cellPadding) }
            }
        }
    }
}

@Composable
private fun RenderGridCell(
    node: VoltraNode?,
    cellPadding: androidx.compose.ui.unit.Dp?,
) {
    if (cellPadding != null) {
        Box(modifier = GlanceModifier.padding(all = cellPadding)) {
            RenderNode(node)
        }
    } else {
        RenderNode(node)
    }
}

private fun extractGridCells(props: Map<String, Any?>?): GridCells =
    when (val columns = props?.get("columns")) {
        is Number -> {
            GridCells.Fixed(columns.toInt().coerceAtLeast(1))
        }

        is String -> {
            val adaptiveMinSize = if (columns.startsWith("a:")) columns.substringAfter("a:").toIntOrNull() else null
            if (adaptiveMinSize != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                GridCells.Adaptive(adaptiveMinSize.coerceAtLeast(1).dp)
            } else {
                // GridCells.Adaptive is @RequiresApi(31); extractGridCells has no access to the
                // widget's measured width, so we can't derive a column count here. Fall back to
                // the same Fixed(2) used for unparseable column values.
                GridCells.Fixed(2)
            }
        }

        else -> {
            GridCells.Fixed(2)
        }
    }
