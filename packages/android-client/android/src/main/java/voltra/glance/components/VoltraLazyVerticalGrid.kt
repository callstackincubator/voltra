package voltra.glance.components

import android.os.Build
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.lazy.GridCells
import androidx.glance.appwidget.lazy.LazyVerticalGrid
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxWidth
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

    // On API 31 and below, Glance delivers LazyVerticalGrid's items through
    // GlanceRemoteViewsService, which the framework binds via
    // AppWidgetManager.bindRemoteViewsService — that requires a real widget id bound to the
    // caller's AppWidgetHost, which no in-app preview can provide (see VoltraRN.kt).
    // Approximate the grid with eager Rows of equal-width cells instead so the preview shows
    // content. Like the real grid, every cell is as wide as a column (the last row keeps empty
    // cells rather than stretching its items), and an item is aligned inside its cell.
    if (context.isPreview && Build.VERSION.SDK_INT <= Build.VERSION_CODES.S) {
        logPreviewApproximation("LazyVerticalGrid")
        val columnCount = deriveFallbackGridColumnCount(element.p, context.widgetSize?.width?.value)
        val rows = items.chunked(columnCount)
        Column(
            modifier = finalModifier,
            horizontalAlignment = horizontalAlignment,
        ) {
            RenderNestedGroups(rows, horizontalAlignment) { row ->
                Row(modifier = GlanceModifier.fillMaxWidth()) {
                    row.forEach { child ->
                        LazyItemBox(horizontalAlignment, GlanceModifier.defaultWeight()) { RenderNode(child) }
                    }
                    repeat(columnCount - row.size) {
                        Spacer(modifier = GlanceModifier.defaultWeight())
                    }
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
