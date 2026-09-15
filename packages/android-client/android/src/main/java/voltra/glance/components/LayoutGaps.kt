package voltra.glance.components

import androidx.compose.ui.unit.Dp
import androidx.glance.Visibility
import voltra.glance.resolveStyle
import voltra.models.VoltraNode
import voltra.styling.StyleConverter

/**
 * Pure (non-Composable) helpers backing the `gap` style on Column, Row, LazyColumn and
 * LazyVerticalGrid. Kept free of Compose so the logic can be unit tested directly.
 */
internal object LayoutGaps {
    /** Number of direct children Jetpack Glance keeps in a Column/Row before truncating. */
    const val GLANCE_CHILD_LIMIT = 10

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
     * Whether a leaf node is invisible (`display: none` -> Glance [Visibility.Gone]) and
     * should therefore be excluded when computing gap spacer placement. Text leaves have
     * no style and are never Gone.
     *
     * This resolves each node's style (including a full [StyleConverter.convert]), so it
     * is only cheap to call on containers that actually need it - see [visibleChildren].
     */
    fun isGone(
        node: VoltraNode,
        sharedStyles: List<Map<String, Any?>>?,
    ): Boolean {
        val element = (node as? VoltraNode.Element)?.element ?: return false
        val resolvedStyle = resolveStyle(element.p, sharedStyles) ?: return false
        return StyleConverter.convert(resolvedStyle).layout.visibility == Visibility.Gone
    }

    /**
     * The children a Column/Row should actually render, in order.
     *
     * When [gap] is not a positive value, [children] is returned unchanged: no per-child
     * style resolution happens, and Gone children stay in the list so they keep being
     * rendered as Glance `Visibility.Gone` views exactly as before the `gap` style
     * existed. When [gap] is positive, Gone children are excluded so they neither receive
     * a spacer nor consume one of Glance's 10 direct-child slots.
     */
    fun visibleChildren(
        children: List<VoltraNode>,
        gap: Dp?,
        sharedStyles: List<Map<String, Any?>>?,
    ): List<VoltraNode> {
        if (!hasPositiveGap(gap)) return children
        return children.filterNot { isGone(it, sharedStyles) }
    }

    /**
     * Indices into a list of visible children (Gone children already filtered out via
     * [visibleChildren] when applicable) that should have a gap spacer rendered before
     * them: every index except the first, and only when [gap] is a positive value.
     */
    fun spacerBeforeIndices(
        visibleChildrenCount: Int,
        gap: Dp?,
    ): Set<Int> {
        if (!hasPositiveGap(gap) || visibleChildrenCount <= 1) return emptySet()
        return (1 until visibleChildrenCount).toSet()
    }

    /**
     * True when the total number of views a Column/Row would render (visible children
     * plus gap spacers) exceeds Glance's hard limit of [GLANCE_CHILD_LIMIT] direct
     * children.
     */
    fun exceedsGlanceChildLimit(
        visibleChildrenCount: Int,
        spacerCount: Int,
    ): Boolean = visibleChildrenCount + spacerCount > GLANCE_CHILD_LIMIT

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

    private fun hasPositiveGap(gap: Dp?): Boolean = gap != null && gap.value > 0f
}
