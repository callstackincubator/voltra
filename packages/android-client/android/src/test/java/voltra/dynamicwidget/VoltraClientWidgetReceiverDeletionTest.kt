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
 * Removing a widget from the home screen drops that placement's configuration (ADR 0006), so a
 * re-added widget starts from the widget-type values rather than inheriting the old placement's.
 *
 * These call [VoltraClientWidgetReceiver.clearInstanceConfiguration], the half of `onDeleted` that
 * follows `super.onDeleted`, rather than `onDeleted` itself. Robolectric has no widget host, so
 * Glance's own `super.onDeleted` fails asynchronously there; calling `onDeleted` here made an
 * unrelated later test in the same JVM fail with an uncaught exception, which is why the cleanup
 * is a separate function. `onDeleted` itself is two statements — `super.onDeleted` then this — and
 * is left to the emulator run in ADR 0006's Verification list.
 *
 * As in [VoltraConfigurationStoreTest], the store is backed by a DataStore this class owns and
 * cancels rather than the process-wide `preferencesDataStore` delegate.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraClientWidgetReceiverDeletionTest {
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
    fun dropsTheDeletedPlacementsValuesAndLeavesASurvivingPlacementAlone() =
        runBlocking {
            store.set("deletion", "label", "type-label")
            store.setInstanceValues("deletion", 1, mapOf("label" to "deleted-one"))
            store.setInstanceValues("deletion", 2, mapOf("label" to "survivor"))

            TestClientWidgetReceiver("deletion").clearInstanceConfiguration(application, intArrayOf(1), store)

            assertEquals("type-label", store.get("deletion", appWidgetId = 1)["label"])
            assertEquals("survivor", store.get("deletion", appWidgetId = 2)["label"])
        }

    @Test
    fun dropsEveryPlacementTheLauncherRemovedInOneGo() =
        runBlocking {
            store.set("deletionMany", "label", "type-label")
            store.setInstanceValues("deletionMany", 1, mapOf("label" to "one"))
            store.setInstanceValues("deletionMany", 2, mapOf("label" to "two"))
            store.setInstanceValues("deletionMany", 3, mapOf("label" to "three"))

            TestClientWidgetReceiver("deletionMany").clearInstanceConfiguration(application, intArrayOf(1, 2), store)

            assertEquals("type-label", store.get("deletionMany", appWidgetId = 1)["label"])
            assertEquals("type-label", store.get("deletionMany", appWidgetId = 2)["label"])
            assertEquals("three", store.get("deletionMany", appWidgetId = 3)["label"])
        }

    @Test
    fun leavesTheWidgetTypeValuesAloneSoOtherPlacementsAreUnaffected() =
        runBlocking {
            store.set("deletionTypeKept", "label", "type-label")
            store.set("deletionTypeKept", "units", "celsius")
            store.setInstanceValues("deletionTypeKept", 1, mapOf("label" to "mine"))

            TestClientWidgetReceiver("deletionTypeKept").clearInstanceConfiguration(application, intArrayOf(1), store)

            val typeValues = store.get("deletionTypeKept")
            assertEquals("type-label", typeValues["label"])
            assertEquals("celsius", typeValues["units"])
        }

    @Test
    fun doesNotTouchAnotherWidgetsPlacementSharingTheSameAppWidgetId() =
        runBlocking {
            // A receiver only ever clears its own widget id's keys, so a recycled appWidgetId
            // belonging to another widget type survives this widget's deletion.
            store.setInstanceValues("deletionSelf", 7, mapOf("label" to "mine"))
            store.setInstanceValues("deletionOther", 7, mapOf("label" to "theirs"))

            TestClientWidgetReceiver("deletionSelf").clearInstanceConfiguration(application, intArrayOf(7), store)

            assertEquals(null, store.get("deletionSelf", appWidgetId = 7)["label"])
            assertEquals("theirs", store.get("deletionOther", appWidgetId = 7)["label"])
        }
}
