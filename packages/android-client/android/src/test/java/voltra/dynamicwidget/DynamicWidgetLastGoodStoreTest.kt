package voltra.dynamicwidget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.io.File

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetLastGoodStoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val directory get() = File(temporaryFolder.root, "last-good")
    private val store get() = DynamicWidgetLastGoodStore(directory)
    private val family = "180x110"

    @Test
    fun readsBackWhatWasWrittenForThatPlacementOnly() {
        assertTrue(store.write("inbox", 1, family, """{"t":18,"c":"one"}"""))
        assertTrue(store.write("inbox", 2, family, """{"t":18,"c":"two"}"""))

        assertEquals("""{"t":18,"c":"one"}""", store.read("inbox", 1, family))
        assertEquals("""{"t":18,"c":"two"}""", store.read("inbox", 2, family))
        assertNull(store.read("inbox", 3, family))
        assertNull(store.read("other", 1, family))
    }

    @Test
    fun skipsAWriteWhoseOutputEqualsTheLastWriteForThePlacement() {
        assertTrue(store.write("inbox", 1, family, """{"t":18,"c":"same"}"""))
        val file = directory.listFiles()!!.single()
        file.setLastModified(1_000L)

        assertFalse(store.write("inbox", 1, family, """{"t":18,"c":"same"}"""))

        assertEquals(1_000L, file.lastModified())
        assertTrue(store.write("inbox", 1, family, """{"t":18,"c":"changed"}"""))
        assertEquals("""{"t":18,"c":"changed"}""", store.read("inbox", 1, family))
    }

    @Test
    fun theSameOutputForAnotherPlacementIsStillWritten() {
        assertTrue(store.write("inbox", 1, family, """{"t":18}"""))

        assertTrue(store.write("inbox", 2, family, """{"t":18}"""))
    }

    @Test
    fun eachSizeOfAPlacementHasItsOwnFile() {
        assertTrue(store.write("inbox", 1, "180x110", """{"t":18,"c":"small"}"""))
        assertTrue(store.write("inbox", 1, "360x220", """{"t":18,"c":"large"}"""))

        assertEquals("""{"t":18,"c":"small"}""", store.read("inbox", 1, "180x110"))
        assertEquals("""{"t":18,"c":"large"}""", store.read("inbox", 1, "360x220"))
        assertNull(store.read("inbox", 1, "90x90"))
    }

    @Test
    fun alternatingBetweenSizesDoesNotDefeatTheUnchangedOutputSkip() {
        store.write("inbox", 1, "180x110", "small")
        store.write("inbox", 1, "360x220", "large")

        // The second composition of each size is what recomposition does next.
        assertFalse(store.write("inbox", 1, "180x110", "small"))
        assertFalse(store.write("inbox", 1, "360x220", "large"))
    }

    @Test
    fun deleteAndRemapCarryEverySizeOfAPlacement() {
        store.write("inbox", 1, "180x110", "small")
        store.write("inbox", 1, "360x220", "large")
        store.write("inbox", 11, "180x110", "other")

        store.remap("inbox", listOf(1), listOf(2))

        assertNull(store.read("inbox", 1, "180x110"))
        assertEquals("small", store.read("inbox", 2, "180x110"))
        assertEquals("large", store.read("inbox", 2, "360x220"))
        assertEquals("other", store.read("inbox", 11, "180x110"))

        store.delete("inbox", listOf(2))

        assertNull(store.read("inbox", 2, "180x110"))
        assertNull(store.read("inbox", 2, "360x220"))
        assertEquals("other", store.read("inbox", 11, "180x110"))
    }

    @Test
    fun aNodeOverTheSizeCapIsNotStoredAndDoesNotEvictTheOlderOne() {
        store.write("inbox", 1, family, """{"t":18,"c":"old"}""")
        val tooBig = "x".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES + 1)

        assertFalse(store.write("inbox", 1, family, tooBig))

        assertEquals("""{"t":18,"c":"old"}""", store.read("inbox", 1, family))
    }

    @Test
    fun aNodeExactlyAtTheCapIsStored() {
        assertTrue(store.write("inbox", 1, family, "x".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES)))
    }

    @Test
    fun theCapIsMeasuredInBytesNotCharacters() {
        // 3 bytes each in UTF-8.
        assertFalse(store.write("inbox", 1, family, "€".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES / 3 + 1)))
    }

    @Test
    fun deleteRemovesOnlyTheNamedPlacements() {
        store.write("inbox", 1, family, "a")
        store.write("inbox", 2, family, "b")
        store.write("inbox", 3, family, "c")

        store.delete("inbox", listOf(1, 2))

        assertNull(store.read("inbox", 1, family))
        assertNull(store.read("inbox", 2, family))
        assertEquals("c", store.read("inbox", 3, family))
    }

    @Test
    fun aDeletedPlacementCanBeWrittenAgainWithTheSameOutput() {
        store.write("inbox", 1, family, "a")
        store.delete("inbox", listOf(1))

        assertTrue(store.write("inbox", 1, family, "a"))
        assertEquals("a", store.read("inbox", 1, family))
    }

    @Test
    fun remapMovesTheFileToTheNewIdAndDropsTheOldOne() {
        store.write("inbox", 1, family, "one")
        store.write("inbox", 2, family, "two")

        store.remap("inbox", listOf(1, 2), listOf(11, 12))

        assertNull(store.read("inbox", 1, family))
        assertNull(store.read("inbox", 2, family))
        assertEquals("one", store.read("inbox", 11, family))
        assertEquals("two", store.read("inbox", 12, family))
    }

    @Test
    fun remapHandlesIdsThatSwapPlaces() {
        store.write("inbox", 1, family, "one")
        store.write("inbox", 2, family, "two")

        store.remap("inbox", listOf(1, 2), listOf(2, 3))

        assertNull(store.read("inbox", 1, family))
        assertEquals("one", store.read("inbox", 2, family))
        assertEquals("two", store.read("inbox", 3, family))
    }

    @Test
    fun remapIgnoresAPlacementWithNoStoredRender() {
        store.write("inbox", 2, family, "two")

        store.remap("inbox", listOf(1, 2), listOf(11, 12))

        assertNull(store.read("inbox", 11, family))
        assertEquals("two", store.read("inbox", 12, family))
    }

    @Test
    fun clearRemovesEveryPlacementOfOneWidgetIdAndNoOther() {
        store.write("inbox", 1, family, "a")
        store.write("inbox", 2, family, "b")
        store.write("inbox-2", 1, family, "c")
        store.write("other", 1, family, "d")

        store.clear("inbox")

        assertEquals(emptySet<Int>(), store.storedAppWidgetIds("inbox"))
        assertEquals("c", store.read("inbox-2", 1, family))
        assertEquals("d", store.read("other", 1, family))
    }

    @Test
    fun clearAllRemovesEverything() {
        store.write("inbox", 1, family, "a")
        store.write("other", 1, family, "d")

        store.clearAll()

        assertNull(store.read("inbox", 1, family))
        assertNull(store.read("other", 1, family))
    }

    @Test
    fun clearingBeforeAnythingWasWrittenIsHarmless() {
        store.clear("inbox")
        store.clearAll()
        store.delete("inbox", listOf(1))
        store.remap("inbox", listOf(1), listOf(2))
    }

    @Test
    fun aWidgetIdWithUnusualCharactersGetsItsOwnFiles() {
        store.write("a/b c", 1, family, "slash")
        store.write("a@1", 2, family, "at")

        assertEquals("slash", store.read("a/b c", 1, family))
        assertEquals("at", store.read("a@1", 2, family))
        assertEquals(setOf(1), store.storedAppWidgetIds("a/b c"))
    }

    @Test
    fun concurrentWritesAndAClearLeaveOnlyWholePayloadsBehind() {
        val payload = { thread: Int, n: Int -> """{"thread":$thread,"n":$n}""" }
        val writers =
            List(4) { thread ->
                Thread { repeat(50) { store.write("busy", thread, family, payload(thread, it)) } }
            }
        val clearer = Thread { repeat(50) { store.clear("busy") } }

        (writers + clearer).forEach { it.start() }
        (writers + clearer).forEach { it.join() }

        for (thread in 0 until 4) {
            val stored = store.read("busy", thread, family)
            assertTrue(
                "thread $thread left a payload nobody wrote: $stored",
                stored == null || (0 until 50).any { stored == payload(thread, it) },
            )
        }
        assertTrue(directory.listFiles().orEmpty().none { it.name.endsWith(".new") })
    }
}
