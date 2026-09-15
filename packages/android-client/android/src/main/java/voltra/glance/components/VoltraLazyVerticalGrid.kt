package voltra.glance.components

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.GridCells
import androidx.glance.appwidget.lazy.LazyVerticalGrid
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import voltra.glance.LocalVoltraRenderContext
import voltra.glance.applyClickableIfNeeded
import voltra.glance.renderers.RenderNode
import voltra.glance.resolveAndApplyStyle
import voltra.models.VoltraElement

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
    val horizontalAlignment = extractHorizontalAlignment(element.p)
    val items = resolveLazyListItems(element.c, context.sharedElements)

    // Glance's setRemoteAdapter action, which LazyVerticalGrid compiles to, requires the
    // inflation root parent to be a real AppWidgetHostView on API 31 and below (see
    // VoltraRN.kt). In VoltraWidgetPreview on those versions, approximate the grid with eager
    // Rows of a fixed column count instead so the preview shows content.
    if (context.isPreview && Build.VERSION.SDK_INT <= Build.VERSION_CODES.S) {
        logPreviewApproximation("LazyVerticalGrid")
        val columnCount = deriveFallbackGridColumnCount(element.p, context.widgetSize?.width?.value)
        val rows = items.chunked(columnCount)
        Column(
            modifier = finalModifier,
            horizontalAlignment = horizontalAlignment,
        ) {
            RenderNestedGroups(rows) { row ->
                Row(horizontalAlignment = horizontalAlignment) {
                    row.forEach { child -> RenderNode(child) }
                }
            }
        }
        return
    }

    LazyVerticalGrid(
        gridCells = extractGridCells(element.p),
        modifier = finalModifier,
        horizontalAlignment = horizontalAlignment,
    ) {
        items(items.size) { index ->
            RenderNode(items[index])
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
