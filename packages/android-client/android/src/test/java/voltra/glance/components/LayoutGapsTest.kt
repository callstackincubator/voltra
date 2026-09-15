package voltra.glance.components

import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
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
    fun flattenChildren_dropsUnresolvedRefsAndNulls() {
        val ref = VoltraNode.Ref(5)
        val array = VoltraNode.Array(listOf(ref, null))

        assertTrue(LayoutGaps.flattenChildren(array, sharedElements = emptyList()).isEmpty())
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

    // --- spacerBeforeIndices ---

    @Test
    fun spacerBeforeIndices_emptyWhenGapIsNullOrZero() {
        assertTrue(LayoutGaps.spacerBeforeIndices(3, null).isEmpty())
        assertTrue(LayoutGaps.spacerBeforeIndices(3, 0.dp).isEmpty())
    }

    @Test
    fun spacerBeforeIndices_emptyForSingleOrNoChildren() {
        assertTrue(LayoutGaps.spacerBeforeIndices(0, 8.dp).isEmpty())
        assertTrue(LayoutGaps.spacerBeforeIndices(1, 8.dp).isEmpty())
    }

    @Test
    fun spacerBeforeIndices_everyIndexExceptFirst() {
        assertEquals(setOf(1, 2, 3), LayoutGaps.spacerBeforeIndices(4, 8.dp))
    }

    // --- exceedsGlanceChildLimit ---

    @Test
    fun exceedsGlanceChildLimit_trueWhenOverTen() {
        assertTrue(LayoutGaps.exceedsGlanceChildLimit(6, 5))
        assertFalse(LayoutGaps.exceedsGlanceChildLimit(5, 5))
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
}
