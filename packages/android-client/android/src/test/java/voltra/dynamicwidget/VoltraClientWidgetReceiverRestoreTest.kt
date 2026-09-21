package voltra.dynamicwidget

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/**
 * A launcher restore hands every placement a new `appWidgetId`; the instance configuration follows
 * it, so a configured placement survives a device restore.
 *
 * These call [VoltraClientWidgetReceiver.remapInstanceConfiguration], the half of `onRestored` that
 * follows `super.onRestored`, for the same reason [VoltraClientWidgetReceiverDeletionTest] calls
 * the cleanup half of `onDeleted` rather than the override itself.
 *
 * As in [VoltraConfigurationStoreTest], the store is backed by a DataStore this class owns and
 * cancels rather than the process-wide `preferencesDataStore` delegate.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraClientWidgetReceiverRestoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val application = RuntimeEnvironment.getApplication()
    private lateinit var dataStoreScope: CoroutineScope
    private lateinit var store: VoltraConfigurationStore

    @Before
    fun createStore() {
        dataStoreScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        store =
            VoltraConfigurationStore(
                context = application,
                dataStore =
                    PreferenceDataStoreFactory.create(scope = dataStoreScope) {
                        File(temporaryFolder.root, "voltra_widget_configuration.preferences_pb")
                    },
            )
    }

    @After
    fun cancelStoreScope() {
        dataStoreScope.cancel()
    }

    private class TestClientWidgetReceiver(
        override val widgetId: String,
    ) : VoltraClientWidgetReceiver()

    @Test
    fun movesEachPlacementsValuesToItsNewId() =
        runBlocking {
            store.set("restore", "city", "Default")
            store.setInstanceValues("restore", 1, mapOf("city" to "London"))
            store.setInstanceValues("restore", 2, mapOf("city" to "New York"))

            TestClientWidgetReceiver(
                "restore",
            ).remapInstanceConfiguration(application, intArrayOf(1, 2), intArrayOf(11, 12), store)

            assertEquals("London", store.get("restore", appWidgetId = 11)["city"])
            assertEquals("New York", store.get("restore", appWidgetId = 12)["city"])
            assertEquals("Default", store.get("restore", appWidgetId = 1)["city"])
            assertEquals("Default", store.get("restore", appWidgetId = 2)["city"])
        }

    @Test
    fun handlesIdsThatChainIntoEachOther() =
        runBlocking {
            store.setInstanceValues("restoreChain", 1, mapOf("city" to "one"))
            store.setInstanceValues("restoreChain", 2, mapOf("city" to "two"))

            TestClientWidgetReceiver(
                "restoreChain",
            ).remapInstanceConfiguration(application, intArrayOf(1, 2), intArrayOf(2, 3), store)

            assertEquals("one", store.get("restoreChain", appWidgetId = 2)["city"])
            assertEquals("two", store.get("restoreChain", appWidgetId = 3)["city"])
            assertEquals(null, store.get("restoreChain", appWidgetId = 1)["city"])
        }

    @Test
    fun skipsAMismatchedIdListAndLeavesEverythingAlone() =
        runBlocking {
            store.setInstanceValues("restoreMismatch", 1, mapOf("city" to "London"))

            TestClientWidgetReceiver(
                "restoreMismatch",
            ).remapInstanceConfiguration(application, intArrayOf(1, 2), intArrayOf(9), store)

            assertEquals("London", store.get("restoreMismatch", appWidgetId = 1)["city"])
            assertEquals(null, store.get("restoreMismatch", appWidgetId = 9)["city"])
        }

    @Test
    fun doesNotTouchAnotherWidgetsPlacements() =
        runBlocking {
            store.setInstanceValues("restoreSelf", 1, mapOf("city" to "mine"))
            store.setInstanceValues("restoreOther", 1, mapOf("city" to "theirs"))

            TestClientWidgetReceiver(
                "restoreSelf",
            ).remapInstanceConfiguration(application, intArrayOf(1), intArrayOf(5), store)

            assertEquals("mine", store.get("restoreSelf", appWidgetId = 5)["city"])
            assertEquals("theirs", store.get("restoreOther", appWidgetId = 1)["city"])
            assertEquals(null, store.get("restoreOther", appWidgetId = 5)["city"])
        }
}
