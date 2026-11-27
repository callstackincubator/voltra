package voltra.events

import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/** Where the queue is stored (ADR 0014): outside Auto Backup. */
@RunWith(RobolectricTestRunner::class)
class VoltraEventQueueStorageTest {
    private val application = RuntimeEnvironment.getApplication()
    private val now = 1_700_000_000_000L
    private val hour = 60 * 60 * 1000L
    private val queueFile = File(application.noBackupFilesDir, "voltra_event_queue_v1.json")
    private val sharedPrefsFile = File(application.dataDir, "shared_prefs/voltra_event_queue_v1.xml")

    private fun removed(appWidgetId: Int) =
        VoltraEvent(
            "widgetRemoved",
            "widget",
            JSONObject().put("widgetType", "weather").put("appWidgetId", appWidgetId),
            retentionMs = hour,
        )

    private fun popRemovedIds(): List<Int> {
        val popped = VoltraEventQueue.pop(application, setOf("widgetRemoved"), now)
        return (0 until popped.length()).map { popped.getJSONObject(it).getInt("appWidgetId") }
    }

    @Test
    fun theQueueIsStoredInTheNoBackupDirectoryAndNotInSharedPreferences() {
        VoltraEventQueue.record(application, removed(1), now)

        assertTrue(queueFile.exists())
        assertFalse(sharedPrefsFile.exists())
    }

    @Test
    fun anUnreadableQueueFileStartsEmpty() {
        queueFile.parentFile?.mkdirs()
        queueFile.writeText("not json")

        assertEquals(emptyList<Int>(), popRemovedIds())

        VoltraEventQueue.record(application, removed(4), now)
        assertEquals(listOf(4), popRemovedIds())
    }
}
