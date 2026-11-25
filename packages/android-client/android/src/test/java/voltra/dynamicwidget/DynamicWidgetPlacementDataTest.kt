package voltra.dynamicwidget

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import java.io.File

/**
 * One call per lifecycle callback moves or drops every per-placement store together. The
 * configuration half is covered by the receiver deletion and restore tests; these pin that the last
 * good render (ADR 0013) follows it, and that the size guard is shared.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetPlacementDataTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val application = RuntimeEnvironment.getApplication()
    private val lastGoodStore get() = DynamicWidgetLastGoodStore(File(temporaryFolder.root, "last-good"))
    private val family = "180x110"
    private lateinit var dataStoreScope: CoroutineScope
    private lateinit var configurationStore: VoltraConfigurationStore

    @Before
    fun createStore() {
        dataStoreScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        configurationStore =
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

    @Test
    fun deletingAPlacementRemovesItsLastGoodRenderAndLeavesTheOthers() {
        lastGoodStore.write("pd-delete", 1, family, "gone")
        lastGoodStore.write("pd-delete", 2, family, "kept")
        lastGoodStore.write("pd-delete-other", 1, family, "other widget")

        DynamicWidgetPlacementData.onDeleted(
            application,
            "pd-delete",
            intArrayOf(1),
            configurationStore,
            lastGoodStore,
        )

        assertNull(lastGoodStore.read("pd-delete", 1, family))
        assertEquals("kept", lastGoodStore.read("pd-delete", 2, family))
        assertEquals("other widget", lastGoodStore.read("pd-delete-other", 1, family))
    }

    @Test
    fun restoringMovesTheLastGoodRenderAndTheConfigurationToTheNewId() =
        runBlocking {
            lastGoodStore.write("pd-restore", 1, family, "london")
            configurationStore.setInstanceValues("pd-restore", 1, mapOf("city" to "London"))

            DynamicWidgetPlacementData.onRestored(
                application,
                "pd-restore",
                intArrayOf(1),
                intArrayOf(9),
                configurationStore,
                lastGoodStore,
            )

            assertNull(lastGoodStore.read("pd-restore", 1, family))
            assertEquals("london", lastGoodStore.read("pd-restore", 9, family))
            assertEquals("London", configurationStore.get("pd-restore", appWidgetId = 9)["city"])
        }

    @Test
    fun aRestoreWithMismatchedIdListsChangesNothingInEitherStore() =
        runBlocking {
            lastGoodStore.write("pd-mismatch", 1, family, "london")
            configurationStore.setInstanceValues("pd-mismatch", 1, mapOf("city" to "London"))

            DynamicWidgetPlacementData.onRestored(
                application,
                "pd-mismatch",
                intArrayOf(1, 2),
                intArrayOf(9),
                configurationStore,
                lastGoodStore,
            )

            assertEquals("london", lastGoodStore.read("pd-mismatch", 1, family))
            assertEquals("London", configurationStore.get("pd-mismatch", appWidgetId = 1)["city"])
        }

    @Test
    fun clearingAWidgetDropsEveryPlacementOfItAndNoOtherWidget() =
        runBlocking {
            lastGoodStore.write("pd-clear", 1, family, "a")
            lastGoodStore.write("pd-clear", 2, family, "b")
            lastGoodStore.write("pd-clear-other", 1, family, "c")
            configurationStore.setOptions("pd-clear", "team", """[{"value":"a","title":"A"}]""")
            configurationStore.setOptions("pd-clear-other", "team", """[{"value":"c","title":"C"}]""")

            DynamicWidgetPlacementData.onWidgetCleared(application, "pd-clear", configurationStore, lastGoodStore)

            assertEquals(emptySet<Int>(), lastGoodStore.storedAppWidgetIds("pd-clear"))
            assertEquals("c", lastGoodStore.read("pd-clear-other", 1, family))
            assertEquals(emptyMap<String, Any>(), configurationStore.options("pd-clear"))
            assertEquals(listOf("c" to "C"), configurationStore.options("pd-clear-other")["team"])
        }

    @Test
    fun clearingEverythingDropsEveryWidget() =
        runBlocking {
            lastGoodStore.write("pd-all-a", 1, family, "a")
            lastGoodStore.write("pd-all-b", 1, family, "b")
            configurationStore.setOptions("pd-all-a", "team", """[{"value":"a","title":"A"}]""")

            DynamicWidgetPlacementData.onAllWidgetsCleared(application, configurationStore, lastGoodStore)

            assertNull(lastGoodStore.read("pd-all-a", 1, family))
            assertNull(lastGoodStore.read("pd-all-b", 1, family))
            assertEquals(emptyMap<String, Any>(), configurationStore.options("pd-all-a"))
        }
}
