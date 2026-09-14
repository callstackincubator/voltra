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
 * The three configuration layers and the isolation the key layout is supposed to buy (ADR 0006).
 *
 * The Robolectric application ships no `voltra/widget_config_defaults.json`, so the defaults layer
 * is empty here and these tests are about the two stored layers.
 *
 * Each test gets its own DataStore in a temporary folder, backed by a scope this class cancels
 * afterwards, rather than the app-wide `preferencesDataStore` delegate. That delegate is a process
 * singleton: a store left running past the test that created it keeps writing to a directory
 * Robolectric has already deleted, and the failure surfaces as an uncaught exception inside
 * whichever test runs next in the same JVM.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraConfigurationStoreTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var dataStoreScope: CoroutineScope
    private lateinit var store: VoltraConfigurationStore

    @Before
    fun createStore() {
        dataStoreScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
        store =
            VoltraConfigurationStore(
                context = RuntimeEnvironment.getApplication(),
                dataStore =
                    PreferenceDataStoreFactory.create(scope = dataStoreScope) {
                        // Must not exist yet: DataStore creates and owns the file.
                        File(temporaryFolder.root, "voltra_widget_configuration.preferences_pb")
                    },
            )
    }

    @After
    fun cancelStoreScope() {
        dataStoreScope.cancel()
        // Process-wide, like the DataStore delegate: a seed left behind would leak into the rest
        // of the JVM.
        VoltraConfigurationStore.seedDefaultsForTesting(null)
    }

    @Test
    fun anInstanceValueHidesTheWidgetTypeValueForTheSameKeyAndLeavesTheOthersShowing() =
        runBlocking {
            store.set("precedence", "label", "type-label")
            store.set("precedence", "units", "celsius")

            store.setInstanceValues("precedence", 1, mapOf("label" to "instance-label"))

            val placement = store.get("precedence", appWidgetId = 1)
            assertEquals("instance-label", placement["label"])
            assertEquals("celsius", placement["units"])
        }

    @Test
    fun readingWithoutAnInstanceReturnsTheWidgetTypeValuesEvenWhenPlacementsHaveTheirOwn() =
        runBlocking {
            store.set("typeOnlyRead", "label", "type-label")
            store.setInstanceValues("typeOnlyRead", 1, mapOf("label" to "instance-label"))

            // What the trial render and the type-level getter read: the widget-type layer, never a
            // particular placement's values.
            assertEquals("type-label", store.get("typeOnlyRead")["label"])
        }

    @Test
    fun twoPlacementsOfOneWidgetDoNotSeeEachOthersValues() =
        runBlocking {
            store.set("twoPlacements", "label", "type-label")

            store.setInstanceValues("twoPlacements", 1, mapOf("label" to "london", "only1" to "one"))
            store.setInstanceValues("twoPlacements", 2, mapOf("label" to "new-york"))

            val first = store.get("twoPlacements", appWidgetId = 1)
            val second = store.get("twoPlacements", appWidgetId = 2)

            assertEquals("london", first["label"])
            assertEquals("new-york", second["label"])
            assertEquals("one", first["only1"])
            assertNull(second["only1"])
        }

    @Test
    fun twoWidgetsSharingAnAppWidgetIdDoNotSeeEachOthersValues() =
        runBlocking {
            // A launcher recycles appWidgetIds across widget types. The instance key carries the
            // widget id, so a recycled id cannot surface the previous widget's values even when
            // onDeleted never fired for the old placement.
            store.setInstanceValues("recycledA", 7, mapOf("label" to "from-a"))
            store.setInstanceValues("recycledB", 7, mapOf("label" to "from-b"))

            assertEquals("from-a", store.get("recycledA", appWidgetId = 7)["label"])
            assertEquals("from-b", store.get("recycledB", appWidgetId = 7)["label"])
        }

    @Test
    fun anInstancePrefixScanDoesNotMatchALongerInstanceIdWithTheSameDigits() =
        runBlocking {
            // Every prefix scan ends with a dot, so "…instance.prefixes.4." never matches a key
            // written for instance 42.
            store.setInstanceValues("prefixes", 42, mapOf("label" to "forty-two"))

            assertNull(store.get("prefixes", appWidgetId = 4)["label"])
            assertEquals("forty-two", store.get("prefixes", appWidgetId = 42)["label"])
        }

    @Test
    fun aWidgetTypeScanNeverMatchesAnInstanceKey() =
        runBlocking {
            // The two prefixes are disjoint families ("voltra.config." and "voltra.instance."), so
            // a placement's values can never leak into what every other placement renders.
            store.setInstanceValues("typeScan", 1, mapOf("instanceOnly" to "instance-value"))

            assertEquals(emptyMap<String, String>(), store.get("typeScan"))
        }

    @Test
    fun clearInstanceDropsThatPlacementsValuesAndLeavesTheWidgetTypeValuesAlone() =
        runBlocking {
            store.set("cleared", "label", "type-label")
            store.setInstanceValues("cleared", 1, mapOf("label" to "instance-label"))
            store.setInstanceValues("cleared", 2, mapOf("label" to "sibling-label"))

            store.clearInstance("cleared", 1)

            // Falls back to the widget-type value rather than losing the key entirely.
            assertEquals("type-label", store.get("cleared", appWidgetId = 1)["label"])
            // The sibling placement is untouched.
            assertEquals("sibling-label", store.get("cleared", appWidgetId = 2)["label"])
            // And so is the widget-type layer.
            assertEquals("type-label", store.get("cleared")["label"])
        }

    @Test
    fun clearInstancesDropsEveryListedPlacementInOneEdit() =
        runBlocking {
            store.set("clearedMany", "label", "type-label")
            store.setInstanceValues("clearedMany", 1, mapOf("label" to "one"))
            store.setInstanceValues("clearedMany", 2, mapOf("label" to "two"))
            store.setInstanceValues("clearedMany", 3, mapOf("label" to "three"))

            store.clearInstances("clearedMany", listOf(1, 2))

            assertEquals("type-label", store.get("clearedMany", appWidgetId = 1)["label"])
            assertEquals("type-label", store.get("clearedMany", appWidgetId = 2)["label"])
            assertEquals("three", store.get("clearedMany", appWidgetId = 3)["label"])
        }

    @Test
    fun clearInstancesWithNoIdsIsANoOp() =
        runBlocking {
            store.setInstanceValues("clearNone", 1, mapOf("label" to "kept"))

            store.clearInstances("clearNone", emptyList())

            assertEquals("kept", store.get("clearNone", appWidgetId = 1)["label"])
        }

    @Test
    fun setInstanceValuesWritesEveryKeyOfAMultiKeyWrite() =
        runBlocking {
            store.setInstanceValues("multiKey", 9, mapOf("a" to "1", "b" to "2", "c" to "3"))

            val placement = store.get("multiKey", appWidgetId = 9)
            assertEquals("1", placement["a"])
            assertEquals("2", placement["b"])
            assertEquals("3", placement["c"])
        }

    @Test
    fun aLaterWidgetTypeWriteDoesNotDisturbAPlacementThatHasItsOwnValue() =
        runBlocking {
            store.setInstanceValues("shadowing", 1, mapOf("label" to "mine"))

            store.set("shadowing", "label", "everyone")

            // The documented shadowing rule: the type-level write reaches the unconfigured
            // placements only.
            assertEquals("mine", store.get("shadowing", appWidgetId = 1)["label"])
            assertEquals("everyone", store.get("shadowing", appWidgetId = 2)["label"])
        }

    @Test
    fun eachLayerHidesTheSameKeyInTheOneBelowIt() =
        runBlocking {
            // The defaults asset a Robolectric application does not ship, stood in for here so the
            // full defaults < widget-type < instance order is asserted rather than just the two
            // stored layers.
            VoltraConfigurationStore.seedDefaultsForTesting(
                mapOf(
                    "threeLayers" to
                        mapOf(
                            "all" to "default-all",
                            "defaultAndType" to "default-both",
                            "onlyDefault" to "default-only",
                        ),
                ),
            )

            store.set("threeLayers", "all", "type-all")
            store.set("threeLayers", "defaultAndType", "type-both")
            store.setInstanceValues("threeLayers", 1, mapOf("all" to "instance-all"))

            val placement = store.get("threeLayers", appWidgetId = 1)
            assertEquals("instance-all", placement["all"])
            assertEquals("type-both", placement["defaultAndType"])
            assertEquals("default-only", placement["onlyDefault"])
        }

    @Test
    fun anUnconfiguredPlacementFallsAllTheWayBackToTheDefaults() =
        runBlocking {
            VoltraConfigurationStore.seedDefaultsForTesting(
                mapOf("defaultsOnly" to mapOf("label" to "from-defaults")),
            )

            assertEquals("from-defaults", store.get("defaultsOnly", appWidgetId = 1)["label"])
            assertEquals("from-defaults", store.get("defaultsOnly")["label"])
        }

    @Test
    fun defaultsOfOneWidgetDoNotLeakIntoAnother() =
        runBlocking {
            VoltraConfigurationStore.seedDefaultsForTesting(
                mapOf("defaultsA" to mapOf("label" to "a-default")),
            )

            assertEquals("a-default", store.get("defaultsA")["label"])
            assertNull(store.get("defaultsB")["label"])
        }
}
