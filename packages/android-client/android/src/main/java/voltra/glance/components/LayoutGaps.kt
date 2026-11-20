package voltra.glance.components

import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.glance.Visibility
import voltra.glance.resolveElementStyle
import voltra.models.VoltraNode
import voltra.modifiers.nativeVisibility

/**
 * Pure (non-Composable) helpers backing the `gap` style on Column, Row, LazyColumn and
 * LazyVerticalGrid. Kept free of Compose so the logic can be unit tested directly.
 */
internal object LayoutGaps {
    /**
     * Flattens a VoltraNode tree into an ordered list of leaf nodes (Element or Text),
     * resolving Array nodes recursively and Ref nodes through [sharedElements]. Null
     * nodes (including refs that fail to resolve) are dropped.
     */
    fun flattenChildren(
        node: VoltraNode?,
        sharedElements: List<VoltraNode>?,
    ): List<VoltraNode> =
        when (node) {
            null -> emptyList()
            is VoltraNode.Array -> node.elements.flatMap { flattenChildren(it, sharedElements) }
            is VoltraNode.Ref -> flattenChildren(sharedElements?.getOrNull(node.ref), sharedElements)
            is VoltraNode.Element -> listOf(node)
            is VoltraNode.Text -> listOf(node)
        }

    /**
     * Whether a leaf node is invisible (Glance [Visibility.Gone]) and should therefore be
     * excluded when deciding where gaps go. Text leaves have no style and are never Gone.
     *
     * Native modifiers are applied after the style and win, so the last valid native
     * `visibility` modifier decides; without one, the style's `display: none` does.
     *
     * This resolves each node's style (including a full style conversion), so it is only
     * cheap to call on containers that actually need it - see [visibleChildren].
     */
    fun isGone(
        node: VoltraNode,
        sharedStyles: List<Map<String, Any?>>?,
    ): Boolean {
        val element = (node as? VoltraNode.Element)?.element ?: return false
        element.nativeVisibility()?.let { return it == "gone" }
        return resolveElementStyle(element, sharedStyles)?.layout?.visibility == Visibility.Gone
    }

    /**
     * The items of a lazy list or grid that should be rendered. Like [visibleChildren], Gone
     * items are dropped only when [gap] is positive, so they do not become an empty row (or
     * a trailing gap). Refs are resolved through [sharedElements] only to check visibility;
     * the item itself is kept as is.
     */
    fun visibleItems(
        items: List<VoltraNode?>,
        gap: Dp?,
        sharedStyles: List<Map<String, Any?>>?,
        sharedElements: List<VoltraNode>?,
    ): List<VoltraNode?> {
        if (!hasPositiveGap(gap)) return items
        return items.filterNot { item ->
            val resolved = if (item is VoltraNode.Ref) sharedElements?.getOrNull(item.ref) else item
            resolved != null && isGone(resolved, sharedStyles)
        }
    }

    /**
     * The children a Column/Row should actually render, in order.
     *
     * When [gap] is not a positive value, [children] is returned unchanged: no per-child
     * style resolution happens, and Gone children stay in the list so they keep being
     * rendered as Glance `Visibility.Gone` views exactly as before the `gap` style
     * existed. When [gap] is positive, Gone children are excluded so they do not get a gap
     * of their own and do not consume one of Glance's 10 direct-child slots.
     */
    fun visibleChildren(
        children: List<VoltraNode>,
        gap: Dp?,
        sharedStyles: List<Map<String, Any?>>?,
    ): List<VoltraNode> {
        if (!hasPositiveGap(gap)) return children
        return children.filterNot { isGone(it, sharedStyles) }
    }

    /** Leading and trailing padding along a container's main axis that simulates `gap`. */
    data class GapInsets(
        val leading: Dp,
        val trailing: Dp,
    )

    /**
     * Main-axis padding for the child at [position] out of [count] children laid out in a
     * line (the visible children of a Column/Row, or the columns of a grid row), or null when
     * [gap] is not a positive value or there is at most one child.
     *
     * The gap is split so that adjacent children are exactly [gap] apart, the first child
     * has no leading padding and the last has no trailing padding (no gap at the
     * container's edge), and every child carries the same total padding of
     * `(count - 1) * gap / count`. Child `i` gets `i * gap / count` before it and
     * `(count - 1 - i) * gap / count` after it.
     *
     * Equal totals matter because the renderer applies this padding to a `Box` wrapping
     * each child (a separate `Spacer` view would use up one of the 10 direct children
     * Glance keeps in a Column/Row): weighted wrappers share the free space equally, so
     * weighted children still end up the same size, as they do with `gap` on iOS.
     */
    fun gapInsets(
        position: Int,
        count: Int,
        gap: Dp?,
    ): GapInsets? {
        if (!hasPositiveGap(gap) || count <= 1) return null
        val g = gap!!
        return GapInsets(
            leading = g * position / count,
            trailing = g * (count - 1 - position) / count,
        )
    }

    /**
     * Whether the item at [index] (0-based, out of [itemCount] total items) in a lazy
     * list should get trailing padding to simulate a gap: every item except the last,
     * and only when [gap] is a positive value.
     */
    fun shouldPadTrailing(
        index: Int,
        itemCount: Int,
        gap: Dp?,
    ): Boolean {
        if (!hasPositiveGap(gap) || itemCount <= 1) return false
        return index < itemCount - 1
    }

    /** Padding, in dp, a `LazyVerticalGrid` cell is wrapped in to simulate the `gap` style. */
    data class CellPadding(
        val start: Dp,
        val top: Dp,
        val end: Dp,
        val bottom: Dp,
    )

    /**
     * Padding for the cell at [index] in a `LazyVerticalGrid`.
     *
     * With a known column count ([columns] non-null, from `GridCells.Fixed`), the gap is
     * applied only between cells, never at the grid's outer edge, matching `gap` on
     * Column/Row: the horizontal gap is split across each row with [gapInsets], and every
     * cell after the first row gets the full gap on its top edge.
     *
     * With an adaptive column count ([columns] null) the renderer cannot know which row or
     * column a cell lands in, so every cell gets half the gap on every edge instead. Adjacent
     * cells are still [gap] apart, but the grid's outer edge also gets half a gap.
     *
     * Returns null when [gap] is not a positive value or the cell needs no padding.
     */
    fun gridCellPadding(
        index: Int,
        columns: Int?,
        gap: Dp?,
    ): CellPadding? {
        if (!hasPositiveGap(gap)) return null
        val g = gap!!
        if (columns == null) {
            val half = g / 2
            return CellPadding(start = half, top = half, end = half, bottom = half)
        }
        val n = columns.coerceAtLeast(1)
        val horizontal = gapInsets(index % n, n, g)
        val padding =
            CellPadding(
                start = horizontal?.leading ?: 0.dp,
                top = if (index / n > 0) g else 0.dp,
                end = horizontal?.trailing ?: 0.dp,
                bottom = 0.dp,
            )
        return padding.takeUnless { it.start.value == 0f && it.top.value == 0f && it.end.value == 0f }
    }

    private fun hasPositiveGap(gap: Dp?): Boolean = gap != null && gap.value > 0f
}
