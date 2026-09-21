package voltra.glance.components

import android.os.Build
import android.util.Log
import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxWidth
import voltra.models.VoltraNode
import kotlin.math.ceil

// Shared helpers for VoltraLazyColumn and VoltraLazyVerticalGrid.
//
// Both the real lazy-list path and the eager preview fallback (see `context.isPreview` in
// those files) need the same "resolve an element's `c` children into a flat list" logic and
// the same "don't exceed Glance's 10 direct-children limit" chunking, so it lives here once.

/** Glance truncates a Column/Row beyond this many direct children. */
internal const val VOLTRA_GLANCE_MAX_DIRECT_CHILDREN = 10

/**
 * Resolves an element's `c` field (a single node, an array of nodes, or a shared-element
 * ref) into a flat list of items, the same way the lazy list `items(...)` blocks do.
 */
internal fun resolveLazyListItems(
    children: VoltraNode?,
    sharedElements: List<VoltraNode>?,
): List<VoltraNode?> =
    when (children) {
        is VoltraNode.Array -> {
            children.elements
        }

        is VoltraNode.Ref -> {
            val resolved = sharedElements?.getOrNull(children.ref)
            if (resolved is VoltraNode.Array) resolved.elements else listOf(resolved)
        }

        null -> {
            emptyList()
        }

        else -> {
            listOf(children)
        }
    }

/**
 * Splits [items] into at most [maxChildren] consecutive groups. A group can itself still hold
 * more than [maxChildren] items; [nestForGlance] recurses into it until every container fits.
 */
internal fun <T> chunkForNesting(
    items: List<T>,
    maxChildren: Int = VOLTRA_GLANCE_MAX_DIRECT_CHILDREN,
): List<List<T>> {
    if (items.size <= maxChildren) return listOf(items)
    val chunkSize = ceil(items.size / maxChildren.toDouble()).toInt().coerceAtLeast(1)
    return items.chunked(chunkSize)
}

/** One direct child of a container in the eager fallback: an item, or a nested group. */
internal sealed class NestedGroupNode<out T> {
    data class Item<T>(
        val item: T,
    ) : NestedGroupNode<T>()

    data class Group<T>(
        val children: List<NestedGroupNode<T>>,
    ) : NestedGroupNode<T>()
}

/**
 * Arranges [items] as the direct children of one Glance Column, nesting groups so that neither
 * that Column nor any nested group has more than [maxChildren] direct children. Arbitrarily
 * long lists therefore never lose items to Glance's per-container truncation. Flattening the
 * result in order gives back [items].
 */
internal fun <T> nestForGlance(
    items: List<T>,
    maxChildren: Int = VOLTRA_GLANCE_MAX_DIRECT_CHILDREN,
): List<NestedGroupNode<T>> {
    require(maxChildren >= 2) { "maxChildren must be at least 2, was $maxChildren" }
    if (items.size <= maxChildren) return items.map { NestedGroupNode.Item(it) }
    return chunkForNesting(items, maxChildren).map { group ->
        NestedGroupNode.Group(nestForGlance(group, maxChildren))
    }
}

/**
 * Renders [items] with [renderItem] as the content of a Column, laid out by [nestForGlance].
 * Nested groups are full-width Columns, so an item that fills the width of the list keeps
 * filling it once the list is long enough to need nesting.
 */
@Composable
internal fun <T> RenderNestedGroups(
    items: List<T>,
    horizontalAlignment: Alignment.Horizontal = Alignment.Horizontal.Start,
    maxChildren: Int = VOLTRA_GLANCE_MAX_DIRECT_CHILDREN,
    renderItem: @Composable (T) -> Unit,
) {
    RenderNestedGroupNodes(nestForGlance(items, maxChildren), horizontalAlignment, renderItem)
}

@Composable
private fun <T> RenderNestedGroupNodes(
    nodes: List<NestedGroupNode<T>>,
    horizontalAlignment: Alignment.Horizontal,
    renderItem: @Composable (T) -> Unit,
) {
    nodes.forEach { node ->
        when (node) {
            is NestedGroupNode.Item -> {
                renderItem(node.item)
            }

            is NestedGroupNode.Group -> {
                Column(
                    modifier = GlanceModifier.fillMaxWidth(),
                    horizontalAlignment = horizontalAlignment,
                ) {
                    RenderNestedGroupNodes(node.children, horizontalAlignment, renderItem)
                }
            }
        }
    }
}

/**
 * Wraps one item of the eager fallback the way Glance wraps every lazy list and grid item: in
 * a Box that fills the width of its row or cell, aligning the item by [horizontalAlignment]
 * and centering it vertically.
 */
@Composable
internal fun LazyItemBox(
    horizontalAlignment: Alignment.Horizontal,
    modifier: GlanceModifier = GlanceModifier.fillMaxWidth(),
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment(horizontalAlignment, Alignment.Vertical.CenterVertically),
    ) {
        content()
    }
}

/** Glance's LazyVerticalGrid only supports fixed column counts from 1 to 5. */
internal const val VOLTRA_GLANCE_MAX_FIXED_GRID_COLUMNS = 5

/**
 * Derives a grid column count for the eager fallback, mirroring what the real grid uses on
 * [sdkInt] (see extractGridCells): a fixed count, clamped to the 1..5 range Glance supports; an
 * adaptive count from the widget width from API 31 on, since below that the real grid uses 2
 * columns; and 2 columns otherwise.
 */
internal fun deriveFallbackGridColumnCount(
    props: Map<String, Any?>?,
    widgetWidthDp: Float?,
    sdkInt: Int = Build.VERSION.SDK_INT,
): Int =
    when (val columns = props?.get("columns")) {
        is Number -> {
            columns.toInt().coerceIn(1, VOLTRA_GLANCE_MAX_FIXED_GRID_COLUMNS)
        }

        is String -> {
            val adaptiveMinSize = if (columns.startsWith("a:")) columns.substringAfter("a:").toIntOrNull() else null
            if (adaptiveMinSize != null &&
                adaptiveMinSize > 0 &&
                sdkInt >= Build.VERSION_CODES.S &&
                widgetWidthDp != null &&
                widgetWidthDp > 0f
            ) {
                (widgetWidthDp / adaptiveMinSize).toInt().coerceIn(1, VOLTRA_GLANCE_MAX_DIRECT_CHILDREN)
            } else {
                2
            }
        }

        else -> {
            2
        }
    }

internal fun logPreviewApproximation(componentName: String) {
    Log.w(
        "Voltra",
        "$componentName is rendered as a non-scrolling approximation in VoltraWidgetPreview " +
            "on Android 12 (API 31) and older, because Glance's collection adapters require a " +
            "real AppWidget host on those versions.",
    )
}
