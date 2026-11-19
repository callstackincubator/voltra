package voltra.glance.components

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class VoltraLazyListFallbackTest {
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
    fun `renders a list within the cap as direct items without nesting`() {
        val items = (1..10).toList()

        assertEquals(items.map { NestedGroupNode.Item(it) }, nestForGlance(items, maxChildren = 10))
    }

    @Test
    fun `nests lists of any length so that no container exceeds the cap`() {
        for (size in listOf(11, 12, 99, 100, 101, 1000, 1001)) {
            val items = (1..size).toList()

            val nodes = nestForGlance(items, maxChildren = 10)

            assertAllContainersWithinCap(nodes, maxChildren = 10)
            assertEquals("items out of order for $size items", items, flatten(nodes))
        }
    }

    @Test
    fun `resolves a null children node to an empty list`() {
        assertEquals(emptyList<Any?>(), resolveLazyListItems(null, sharedElements = null))
    }

    private fun assertAllContainersWithinCap(
        nodes: List<NestedGroupNode<Int>>,
        maxChildren: Int,
    ) {
        assertTrue("container has ${nodes.size} direct children", nodes.size <= maxChildren)
        nodes.filterIsInstance<NestedGroupNode.Group<Int>>().forEach {
            assertAllContainersWithinCap(it.children, maxChildren)
        }
    }

    private fun flatten(nodes: List<NestedGroupNode<Int>>): List<Int> =
        nodes.flatMap { node ->
            when (node) {
                is NestedGroupNode.Item -> listOf(node.item)
                is NestedGroupNode.Group -> flatten(node.children)
            }
        }
}
