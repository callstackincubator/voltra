package voltra.dynamicwidget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/**
 * `onDeleted` and `onRestored` carry a placement's last good render with it (ADR 0013, section 5).
 * As in [VoltraClientWidgetReceiverDeletionTest], the tests call the helper halves that follow
 * `super.onDeleted` / `super.onRestored`, which Robolectric cannot run.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraClientWidgetReceiverLastGoodTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val application = RuntimeEnvironment.getApplication()
    private val store get() = DynamicWidgetLastGoodStore(File(temporaryFolder.root, "last-good"))

    private class TestClientWidgetReceiver(
        override val widgetId: String,
    ) : VoltraClientWidgetReceiver()

    @Test
    fun deletingAPlacementRemovesItsLastGoodRenderAndLeavesTheOthers() {
        store.write("lg-delete", 1, "gone")
        store.write("lg-delete", 2, "kept")
        store.write("lg-delete-other", 1, "other widget")

        TestClientWidgetReceiver("lg-delete").clearLastGoodRender(application, intArrayOf(1), store)

        assertNull(store.read("lg-delete", 1))
        assertEquals("kept", store.read("lg-delete", 2))
        assertEquals("other widget", store.read("lg-delete-other", 1))
    }

    @Test
    fun restoringMovesTheLastGoodRenderToTheNewId() {
        store.write("lg-restore", 1, "london")

        TestClientWidgetReceiver("lg-restore").remapLastGoodRender(application, intArrayOf(1), intArrayOf(9), store)

        assertNull(store.read("lg-restore", 1))
        assertEquals("london", store.read("lg-restore", 9))
    }

    @Test
    fun aRestoreWithMismatchedIdListsChangesNothing() {
        store.write("lg-mismatch", 1, "london")

        TestClientWidgetReceiver("lg-mismatch")
            .remapLastGoodRender(application, intArrayOf(1, 2), intArrayOf(9), store)

        assertEquals("london", store.read("lg-mismatch", 1))
    }
}
