package voltra.glance.components

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import voltra.models.VoltraElement
import voltra.models.VoltraNode

class LayoutGapsTest {
    private fun element(props: Map<String, Any?>? = null) = VoltraNode.Element(VoltraElement(t = 0, p = props))

    private fun text(value: String) = VoltraNode.Text(value)

    // --- flattenChildren ---

    @Test
    fun flattenChildren_returnsSingleLeafUnchanged() {
        val leaf = element()

        assertEquals(listOf(leaf), LayoutGaps.flattenChildren(leaf, sharedElements = null))
    }

    @Test
    fun flattenChildren_flattensNestedArrays() {
        val a = element()
        val b = text("hello")
        val nested = VoltraNode.Array(listOf(VoltraNode.Array(listOf(a)), b))

        assertEquals(listOf(a, b), LayoutGaps.flattenChildren(nested, sharedElements = null))
    }

    @Test
    fun flattenChildren_resolvesRefsThroughSharedElements() {
        val target = element()
        val sharedElements = listOf(target)
        val ref = VoltraNode.Ref(0)

        assertEquals(listOf(target), LayoutGaps.flattenChildren(ref, sharedElements))
    }

    @Test
    fun flattenChildren_dropsUnresolvedRefs() {
        val ref = VoltraNode.Ref(5)

        assertTrue(LayoutGaps.flattenChildren(ref, sharedElements = emptyList()).isEmpty())
    }

    @Test
    fun flattenChildren_dropsNulls() {
        assertTrue(LayoutGaps.flattenChildren(null, sharedElements = null).isEmpty())
    }

    // --- isGone ---

    @Test
    fun isGone_trueForDisplayNone() {
        val node = element(mapOf("style" to mapOf("display" to "none")))

        assertTrue(LayoutGaps.isGone(node, sharedStyles = null))
    }

    @Test
    fun isGone_falseForOrdinaryElement() {
        val node = element(mapOf("style" to mapOf("width" to 10)))

        assertFalse(LayoutGaps.isGone(node, sharedStyles = null))
    }

    @Test
    fun isGone_falseForTextLeaf() {
        assertFalse(LayoutGaps.isGone(text("hi"), sharedStyles = null))
    }

    // --- visibleChildren ---

    @Test
    fun visibleChildren_retainsGoneChildWhenGapIsNullOrZero() {
        val visible = element()
        val gone = element(mapOf("style" to mapOf("display" to "none")))
        val children = listOf(visible, gone)

        assertEquals(children, LayoutGaps.visibleChildren(children, gap = null, sharedStyles = null))
        assertEquals(children, LayoutGaps.visibleChildren(children, gap = 0.dp, sharedStyles = null))
    }

    @Test
    fun visibleChildren_excludesGoneChildWhenGapIsPositive() {
        val visible = element()
        val gone = element(mapOf("style" to mapOf("display" to "none")))
        val children = listOf(visible, gone)

        assertEquals(listOf(visible), LayoutGaps.visibleChildren(children, gap = 8.dp, sharedStyles = null))
    }

    // --- gapInsets ---

    @Test
    fun gapInsets_nullWhenGapIsNullOrZero() {
        assertNull(LayoutGaps.gapInsets(1, 3, null))
        assertNull(LayoutGaps.gapInsets(1, 3, 0.dp))
    }

    @Test
    fun gapInsets_nullForSingleOrNoChildren() {
        assertNull(LayoutGaps.gapInsets(0, 0, 8.dp))
        assertNull(LayoutGaps.gapInsets(0, 1, 8.dp))
    }

    @Test
    fun gapInsets_twoChildrenPutTheWholeGapBetweenThem() {
        assertEquals(LayoutGaps.GapInsets(leading = 0.dp, trailing = 4.dp), LayoutGaps.gapInsets(0, 2, 8.dp))
        assertEquals(LayoutGaps.GapInsets(leading = 4.dp, trailing = 0.dp), LayoutGaps.gapInsets(1, 2, 8.dp))
    }

    @Test
    fun gapInsets_adjacentChildrenAreOneGapApartWithNoGapAtTheEdges() {
        val count = 4
        val gap = 12.dp
        val insets = (0 until count).map { LayoutGaps.gapInsets(it, count, gap)!! }

        assertEquals(0.dp, insets.first().leading)
        assertEquals(0.dp, insets.last().trailing)
        for (i in 0 until count - 1) {
            assertEquals(gap.value, (insets[i].trailing + insets[i + 1].leading).value, 0.001f)
        }
    }

    @Test
    fun gapInsets_everyChildCarriesTheSameTotalSoWeightedChildrenStayEqual() {
        val count = 3
        val gap = 9.dp
        val totals =
            (0 until count).map {
                LayoutGaps.gapInsets(it, count, gap)!!.let { g ->
                    (g.leading + g.trailing).value
                }
            }

        totals.forEach { assertEquals(6f, it, 0.001f) }
    }

    @Test
    fun gapInsets_tenChildrenAllGetAGapWithoutExtraViews() {
        // A Column/Row keeps its own children as its only direct children: ten children
        // with a gap still render as ten views, so Glance's 10-child limit keeps them all.
        val insets = (0 until 10).map { LayoutGaps.gapInsets(it, 10, 8.dp) }

        assertTrue(insets.all { it != null })
    }

    // --- shouldPadTrailing ---

    @Test
    fun shouldPadTrailing_falseWhenGapIsNullOrZero() {
        assertFalse(LayoutGaps.shouldPadTrailing(0, 3, null))
        assertFalse(LayoutGaps.shouldPadTrailing(0, 3, 0.dp))
    }

    @Test
    fun shouldPadTrailing_falseForSingleItem() {
        assertFalse(LayoutGaps.shouldPadTrailing(0, 1, 8.dp))
    }

    @Test
    fun shouldPadTrailing_trueForFirstAndMiddleFalseForLast() {
        assertTrue(LayoutGaps.shouldPadTrailing(0, 3, 8.dp))
        assertTrue(LayoutGaps.shouldPadTrailing(1, 3, 8.dp))
        assertFalse(LayoutGaps.shouldPadTrailing(2, 3, 8.dp))
    }

    // --- gridCellPadding ---

    @Test
    fun gridCellPadding_nullWhenGapIsNullOrZero() {
        assertNull(LayoutGaps.gridCellPadding(3, 2, null))
        assertNull(LayoutGaps.gridCellPadding(3, 2, 0.dp))
    }

    @Test
    fun gridCellPadding_fixedColumnsKeepTheGapOffTheOuterEdge() {
        val gap = 8.dp
        // Two columns: [0, 1] / [2, 3]
        assertEquals(
            LayoutGaps.CellPadding(start = 0.dp, top = 0.dp, end = 4.dp, bottom = 0.dp),
            LayoutGaps.gridCellPadding(0, 2, gap),
        )
        assertEquals(
            LayoutGaps.CellPadding(start = 4.dp, top = 0.dp, end = 0.dp, bottom = 0.dp),
            LayoutGaps.gridCellPadding(1, 2, gap),
        )
        assertEquals(
            LayoutGaps.CellPadding(start = 0.dp, top = 8.dp, end = 4.dp, bottom = 0.dp),
            LayoutGaps.gridCellPadding(2, 2, gap),
        )
        assertEquals(
            LayoutGaps.CellPadding(start = 4.dp, top = 8.dp, end = 0.dp, bottom = 0.dp),
            LayoutGaps.gridCellPadding(3, 2, gap),
        )
    }

    @Test
    fun gridCellPadding_singleColumnOnlySpacesRows() {
        assertNull(LayoutGaps.gridCellPadding(0, 1, 8.dp))
        assertEquals(
            LayoutGaps.CellPadding(start = 0.dp, top = 8.dp, end = 0.dp, bottom = 0.dp),
            LayoutGaps.gridCellPadding(1, 1, 8.dp),
        )
    }

    @Test
    fun gridCellPadding_adaptiveColumnsFallBackToHalfGapOnEveryEdge() {
        assertEquals(
            LayoutGaps.CellPadding(start = 4.dp, top = 4.dp, end = 4.dp, bottom = 4.dp),
            LayoutGaps.gridCellPadding(5, null, 8.dp),
        )
    }
}
