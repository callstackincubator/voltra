package voltra.glance.components

import org.junit.Assert.assertEquals
import org.junit.Test

class VoltraLazyListFallbackTest {
    @Test
    fun `derives a fixed column count from a numeric columns prop`() {
        assertEquals(3, deriveFallbackGridColumnCount(mapOf("columns" to 3), widgetWidthDp = null))
    }

    @Test
    fun `clamps a numeric columns prop to at most the direct-children cap`() {
        assertEquals(10, deriveFallbackGridColumnCount(mapOf("columns" to 25), widgetWidthDp = null))
    }

    @Test
    fun `derives an adaptive column count from the widget width and minSize`() {
        assertEquals(4, deriveFallbackGridColumnCount(mapOf("columns" to "a:50"), widgetWidthDp = 220f))
    }

    @Test
    fun `falls back to 2 columns for adaptive props without a known widget width`() {
        assertEquals(2, deriveFallbackGridColumnCount(mapOf("columns" to "a:50"), widgetWidthDp = null))
    }

    @Test
    fun `falls back to 2 columns for an unparseable columns prop`() {
        assertEquals(2, deriveFallbackGridColumnCount(mapOf("columns" to "not-a-column-spec"), widgetWidthDp = 220f))
    }

    @Test
    fun `falls back to 2 columns when no columns prop is present`() {
        assertEquals(2, deriveFallbackGridColumnCount(props = null, widgetWidthDp = 220f))
    }

    @Test
    fun `keeps a short list as a single group`() {
        val items = (1..5).toList()

        assertEquals(listOf(items), chunkForNesting(items, maxChildren = 10))
    }

    @Test
    fun `chunks a list that exceeds the cap into at most maxChildren groups`() {
        val items = (1..25).toList()

        val groups = chunkForNesting(items, maxChildren = 10)

        assert(groups.size <= 10) { "expected at most 10 groups, got ${groups.size}" }
        assertEquals(items, groups.flatten())
    }

    @Test
    fun `chunks a very large list into groups that themselves respect the cap`() {
        val items = (1..1000).toList()

        val groups = chunkForNesting(items, maxChildren = 10)

        assert(groups.size <= 10) { "expected at most 10 groups, got ${groups.size}" }
        assertEquals(items, groups.flatten())
    }

    @Test
    fun `resolves a null children node to an empty list`() {
        assertEquals(emptyList<Any?>(), resolveLazyListItems(null, sharedElements = null))
    }
}
