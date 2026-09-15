package voltra.glance.components

import android.util.Log
import androidx.compose.runtime.Composable
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
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
 * Splits [items] into groups small enough to be direct children of a single Glance
 * Column/Row (at most [maxChildren]), recursing on the caller's side (see
 * [RenderNestedGroups]) so that arbitrarily long lists never silently lose items to
 * Glance's per-container truncation.
 */
internal fun <T> chunkForNesting(
    items: List<T>,
    maxChildren: Int = VOLTRA_GLANCE_MAX_DIRECT_CHILDREN,
): List<List<T>> {
    if (items.size <= maxChildren) return listOf(items)
    val chunkSize = ceil(items.size / maxChildren.toDouble()).toInt().coerceAtLeast(1)
    return items.chunked(chunkSize)
}

/**
 * Renders [items] with [renderItem], nesting extra Columns as needed so that no single
 * Column ever receives more than [maxChildren] direct children. Overflow Columns carry
 * [horizontalAlignment] so a long list keeps the alignment the caller set on the outer
 * container.
 */
@Composable
internal fun <T> RenderNestedGroups(
    items: List<T>,
    horizontalAlignment: Alignment.Horizontal = Alignment.Horizontal.Start,
    maxChildren: Int = VOLTRA_GLANCE_MAX_DIRECT_CHILDREN,
    renderItem: @Composable (T) -> Unit,
) {
    if (items.size <= maxChildren) {
        items.forEach { renderItem(it) }
        return
    }
    chunkForNesting(items, maxChildren).forEach { group ->
        Column(horizontalAlignment = horizontalAlignment) {
            RenderNestedGroups(group, horizontalAlignment, maxChildren, renderItem)
        }
    }
}

/** Derives a grid column count for the eager fallback, mirroring [extractGridCells]. */
internal fun deriveFallbackGridColumnCount(
    props: Map<String, Any?>?,
    widgetWidthDp: Float?,
): Int =
    when (val columns = props?.get("columns")) {
        is Number -> {
            columns.toInt().coerceIn(1, VOLTRA_GLANCE_MAX_DIRECT_CHILDREN)
        }

        is String -> {
            val adaptiveMinSize = if (columns.startsWith("a:")) columns.substringAfter("a:").toIntOrNull() else null
            if (adaptiveMinSize != null && adaptiveMinSize > 0 && widgetWidthDp != null && widgetWidthDp > 0f) {
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
