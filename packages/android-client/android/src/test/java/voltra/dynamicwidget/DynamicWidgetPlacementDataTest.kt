package voltra.dynamicwidget

import android.content.pm.PackageInfo
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import voltra.dynamicwidget.lifecycle.DynamicWidgetPlacement
import voltra.dynamicwidget.lifecycle.DynamicWidgetPlacementRegistry
import java.io.File

/**
 * One call per lifecycle callback moves or drops every per-placement store together. The
 * configuration half is covered by the receiver deletion and restore tests; these pin that the last
 * good render (ADR 0013) and the placement registry follow it, that a failing store skips no other,
 * and that the size guard is shared.
 */
@RunWith(RobolectricTestRunner::class)
class DynamicWidgetPlacementDataTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private val application = RuntimeEnvironment.getApplication()
    private val lastGoodStore get() = DynamicWidgetLastGoodStore(File(temporaryFolder.root, "last-good"))
    private val family = "180x110"
    private val size = WidgetPlacementSize(110, 40, emptyList())
    private val upgraded =
        PackageInfo().apply {
            firstInstallTime = 1_000
            lastUpdateTime = 2_000
        }
    private val failingRegistry
        get() =
            DynamicWidgetPlacementRegistry(application, { throw IllegalStateException("no widget host") }, { upgraded })
    private lateinit var dataStoreScope: CoroutineScope
    private lateinit var configurationStore: VoltraConfigurationStore

    private fun registryHolding(vararg placements: Pair<String, Int>) =
        DynamicWidgetPlacementRegistry(
            application,
            {
                placements
                    .map { (widgetType, appWidgetId) -> DynamicWidgetPlacement(widgetType, appWidgetId, size) }
                    .groupBy { it.widgetType }
            },
            { upgraded },
        )

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

            val registry = registryHolding("pd-mismatch" to 1)

            val moved =
                DynamicWidgetPlacementData.onRestored(
                    application,
                    "pd-mismatch",
                    intArrayOf(1, 2),
                    intArrayOf(9),
                    configurationStore,
                    lastGoodStore,
                    registry,
                )

            assertEquals(emptyList<Pair<Int, Int>>(), moved)
            assertEquals("london", lastGoodStore.read("pd-mismatch", 1, family))
            assertEquals("London", configurationStore.get("pd-mismatch", appWidgetId = 1)["city"])
            assertNotNull(registry.sizeOf("pd-mismatch", 1))
        }

    @Test
    fun aRestoreReturnsOnlyThePairsWhoseOldIdTheRegistryKnew() {
        val registry = registryHolding("pd-known" to 1)

        val moved =
            DynamicWidgetPlacementData.onRestored(
                application,
                "pd-known",
                intArrayOf(1, 2),
                intArrayOf(11, 12),
                configurationStore,
                lastGoodStore,
                registry,
            )

        assertEquals(listOf(1 to 11), moved)
        assertNull(registry.sizeOf("pd-known", 1))
        assertEquals(size, registry.sizeOf("pd-known", 11))
    }

    @Test
    fun aFailingRegistryRestoresNothingButTheOtherStoresAreStillRemapped() =
        runBlocking {
            lastGoodStore.write("pd-restore-failing", 1, family, "london")
            configurationStore.setInstanceValues("pd-restore-failing", 1, mapOf("city" to "London"))

            val moved =
                DynamicWidgetPlacementData.onRestored(
                    application,
                    "pd-restore-failing",
                    intArrayOf(1),
                    intArrayOf(9),
                    configurationStore,
                    lastGoodStore,
                    failingRegistry,
                )

            assertEquals(emptyList<Pair<Int, Int>>(), moved)
            assertEquals("london", lastGoodStore.read("pd-restore-failing", 9, family))
            assertEquals("London", configurationStore.get("pd-restore-failing", appWidgetId = 9)["city"])
        }

    @Test
    fun deletingAPlacementForgetsItInTheRegistry() {
        val registry = registryHolding("pd-forget" to 1, "pd-forget" to 2)

        DynamicWidgetPlacementData.onDeleted(
            application,
            "pd-forget",
            intArrayOf(1),
            configurationStore,
            lastGoodStore,
            registry,
        )

        assertNull(registry.sizeOf("pd-forget", 1))
        assertNotNull(registry.sizeOf("pd-forget", 2))
    }

    @Test
    fun aFailingRegistryDoesNotSkipTheOtherStoresCleanupOnDelete() =
        runBlocking {
            lastGoodStore.write("pd-delete-failing", 1, family, "gone")
            configurationStore.setInstanceValues("pd-delete-failing", 1, mapOf("city" to "London"))

            DynamicWidgetPlacementData.onDeleted(
                application,
                "pd-delete-failing",
                intArrayOf(1),
                configurationStore,
                lastGoodStore,
                failingRegistry,
            )

            assertNull(lastGoodStore.read("pd-delete-failing", 1, family))
            assertNull(configurationStore.get("pd-delete-failing", appWidgetId = 1)["city"])
        }

    @Test
    fun clearingAWidgetDropsEveryPlacementOfItAndNoOtherWidget() {
        lastGoodStore.write("pd-clear", 1, family, "a")
        lastGoodStore.write("pd-clear", 2, family, "b")
        lastGoodStore.write("pd-clear-other", 1, family, "c")

        DynamicWidgetPlacementData.onWidgetCleared(application, "pd-clear", lastGoodStore)

        assertEquals(emptySet<Int>(), lastGoodStore.storedAppWidgetIds("pd-clear"))
        assertEquals("c", lastGoodStore.read("pd-clear-other", 1, family))
    }

    @Test
    fun clearingEverythingDropsEveryWidget() {
        lastGoodStore.write("pd-all-a", 1, family, "a")
        lastGoodStore.write("pd-all-b", 1, family, "b")

        DynamicWidgetPlacementData.onAllWidgetsCleared(application, lastGoodStore)

        assertNull(lastGoodStore.read("pd-all-a", 1, family))
        assertNull(lastGoodStore.read("pd-all-b", 1, family))
    }
}
