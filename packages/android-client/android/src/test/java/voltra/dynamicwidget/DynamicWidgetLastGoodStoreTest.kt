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

    @Test
    fun readsBackWhatWasWrittenForThatPlacementOnly() {
        assertTrue(store.write("inbox", 1, """{"t":18,"c":"one"}"""))
        assertTrue(store.write("inbox", 2, """{"t":18,"c":"two"}"""))

        assertEquals("""{"t":18,"c":"one"}""", store.read("inbox", 1))
        assertEquals("""{"t":18,"c":"two"}""", store.read("inbox", 2))
        assertNull(store.read("inbox", 3))
        assertNull(store.read("other", 1))
    }

    @Test
    fun skipsAWriteWhoseOutputEqualsTheLastWriteForThePlacement() {
        assertTrue(store.write("inbox", 1, """{"t":18,"c":"same"}"""))
        val file = directory.listFiles()!!.single()
        file.setLastModified(1_000L)

        assertFalse(store.write("inbox", 1, """{"t":18,"c":"same"}"""))

        assertEquals(1_000L, file.lastModified())
        assertTrue(store.write("inbox", 1, """{"t":18,"c":"changed"}"""))
        assertEquals("""{"t":18,"c":"changed"}""", store.read("inbox", 1))
    }

    @Test
    fun theSameOutputForAnotherPlacementIsStillWritten() {
        assertTrue(store.write("inbox", 1, """{"t":18}"""))

        assertTrue(store.write("inbox", 2, """{"t":18}"""))
    }

    @Test
    fun aNodeOverTheSizeCapIsNotStoredAndDoesNotEvictTheOlderOne() {
        store.write("inbox", 1, """{"t":18,"c":"old"}""")
        val tooBig = "x".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES + 1)

        assertFalse(store.write("inbox", 1, tooBig))

        assertEquals("""{"t":18,"c":"old"}""", store.read("inbox", 1))
    }

    @Test
    fun aNodeExactlyAtTheCapIsStored() {
        assertTrue(store.write("inbox", 1, "x".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES)))
    }

    @Test
    fun theCapIsMeasuredInBytesNotCharacters() {
        // 3 bytes each in UTF-8.
        assertFalse(store.write("inbox", 1, "€".repeat(DynamicWidgetLastGoodStore.MAX_NODE_BYTES / 3 + 1)))
    }

    @Test
    fun deleteRemovesOnlyTheNamedPlacements() {
        store.write("inbox", 1, "a")
        store.write("inbox", 2, "b")
        store.write("inbox", 3, "c")

        store.delete("inbox", listOf(1, 2))

        assertNull(store.read("inbox", 1))
        assertNull(store.read("inbox", 2))
        assertEquals("c", store.read("inbox", 3))
    }

    @Test
    fun aDeletedPlacementCanBeWrittenAgainWithTheSameOutput() {
        store.write("inbox", 1, "a")
        store.delete("inbox", listOf(1))

        assertTrue(store.write("inbox", 1, "a"))
        assertEquals("a", store.read("inbox", 1))
    }

    @Test
    fun remapMovesTheFileToTheNewIdAndDropsTheOldOne() {
        store.write("inbox", 1, "one")
        store.write("inbox", 2, "two")

        store.remap("inbox", listOf(1, 2), listOf(11, 12))

        assertNull(store.read("inbox", 1))
        assertNull(store.read("inbox", 2))
        assertEquals("one", store.read("inbox", 11))
        assertEquals("two", store.read("inbox", 12))
    }

    @Test
    fun remapHandlesIdsThatSwapPlaces() {
        store.write("inbox", 1, "one")
        store.write("inbox", 2, "two")

        store.remap("inbox", listOf(1, 2), listOf(2, 3))

        assertNull(store.read("inbox", 1))
        assertEquals("one", store.read("inbox", 2))
        assertEquals("two", store.read("inbox", 3))
    }

    @Test
    fun remapIgnoresAPlacementWithNoStoredRender() {
        store.write("inbox", 2, "two")

        store.remap("inbox", listOf(1, 2), listOf(11, 12))

        assertNull(store.read("inbox", 11))
        assertEquals("two", store.read("inbox", 12))
    }

    @Test
    fun clearRemovesEveryPlacementOfOneWidgetIdAndNoOther() {
        store.write("inbox", 1, "a")
        store.write("inbox", 2, "b")
        store.write("inbox-2", 1, "c")
        store.write("other", 1, "d")

        store.clear("inbox")

        assertEquals(emptySet<Int>(), store.storedAppWidgetIds("inbox"))
        assertEquals("c", store.read("inbox-2", 1))
        assertEquals("d", store.read("other", 1))
    }

    @Test
    fun clearAllRemovesEverything() {
        store.write("inbox", 1, "a")
        store.write("other", 1, "d")

        store.clearAll()

        assertNull(store.read("inbox", 1))
        assertNull(store.read("other", 1))
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
        store.write("a/b c", 1, "slash")
        store.write("a@1", 2, "at")

        assertEquals("slash", store.read("a/b c", 1))
        assertEquals("at", store.read("a@1", 2))
        assertEquals(setOf(1), store.storedAppWidgetIds("a/b c"))
    }

    @Test
    fun concurrentWritesAndAClearLeaveOnlyWholePayloadsBehind() {
        val payload = { thread: Int, n: Int -> """{"thread":$thread,"n":$n}""" }
        val writers =
            List(4) { thread ->
                Thread { repeat(50) { store.write("busy", thread, payload(thread, it)) } }
            }
        val clearer = Thread { repeat(50) { store.clear("busy") } }

        (writers + clearer).forEach { it.start() }
        (writers + clearer).forEach { it.join() }

        for (thread in 0 until 4) {
            val stored = store.read("busy", thread)
            assertTrue(
                "thread $thread left a payload nobody wrote: $stored",
                stored == null || (0 until 50).any { stored == payload(thread, it) },
            )
        }
        assertTrue(directory.listFiles().orEmpty().none { it.name.endsWith(".new") })
    }
}
