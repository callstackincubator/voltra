package voltra.runtime

import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

@RunWith(RobolectricTestRunner::class)
class VoltraConfigurationStoreTest {
    // Robolectric resets statics per test class, not per method, so the one-time migration flag
    // would otherwise leak between tests and make ordering significant.
    @Before
    fun resetProcessCaches() {
        VoltraConfigurationStore.resetProcessCachesForTesting()
    }

    @Test
    fun mergesDefaultsTypeAndInstanceValuesWithInstanceWinning() =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val store = VoltraConfigurationStore(context)

            // No defaults asset in the test app, so defaults start empty; type + instance layers
            // are still expected to merge with instance values overriding type values.
            store.set("widget_a", "label", "type-label")
            store.set("widget_a", "onlyType", "type-only")

            var merged = store.get("widget_a", appWidgetId = 1)
            assertEquals("type-label", merged["label"])
            assertEquals("type-only", merged["onlyType"])

            store.setValues(1, mapOf("label" to "instance-label", "onlyInstance" to "instance-only"))

            merged = store.get("widget_a", appWidgetId = 1)
            assertEquals("instance-label", merged["label"]) // instance wins over type
            assertEquals("type-only", merged["onlyType"]) // type value still present
            assertEquals("instance-only", merged["onlyInstance"]) // instance-only value present

            // A different instance of the same type doesn't see instance 1's values.
            val otherInstance = store.get("widget_a", appWidgetId = 2)
            assertEquals("type-label", otherInstance["label"])
            assertNull(otherInstance["onlyInstance"])
        }

    @Test
    fun setValuesWritesAllKeysInOneTransaction() =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val store = VoltraConfigurationStore(context)

            store.setValues(42, mapOf("a" to "1", "b" to "2", "c" to "3"))

            val merged = store.get("widget_b", appWidgetId = 42)
            assertEquals("1", merged["a"])
            assertEquals("2", merged["b"])
            assertEquals("3", merged["c"])
        }

    @Test
    fun clearInstanceRemovesOnlyThatInstancesKeys() =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()
            val store = VoltraConfigurationStore(context)

            store.setValues(1, mapOf("label" to "instance-1"))
            store.setValues(2, mapOf("label" to "instance-2"))
            store.set("widget_c", "label", "type-label")

            store.clearInstance(1)

            val instance1 = store.get("widget_c", appWidgetId = 1)
            assertEquals("type-label", instance1["label"]) // falls back to type value

            val instance2 = store.get("widget_c", appWidgetId = 2)
            assertEquals("instance-2", instance2["label"]) // untouched
        }

    @Test
    fun migratesLegacyKeysToNewFormatAndDropsLegacyKeys() =
        runBlocking {
            val context = RuntimeEnvironment.getApplication()

            // Seed a legacy-format key directly, predating the voltra.config.widget./instance.
            // namespacing, plus a new-format key for the same widget+key that should win.
            context.voltraConfigurationDataStore.edit { prefs ->
                prefs[stringPreferencesKey("voltra.config.legacy_widget.legacyOnly")] = "legacy-value"
                prefs[stringPreferencesKey("voltra.config.legacy_widget.both")] = "legacy-both-value"
                prefs[stringPreferencesKey("voltra.config.widget.legacy_widget.both")] = "new-both-value"
            }

            val store = VoltraConfigurationStore(context)
            val merged = store.get("legacy_widget")

            // Legacy-only key got migrated to the new namespace and is readable.
            assertEquals("legacy-value", merged["legacyOnly"])
            // New-format value wins when both exist for the same widget+key.
            assertEquals("new-both-value", merged["both"])

            val snapshot = context.voltraConfigurationDataStore.data.first()
            assertFalse(snapshot.asMap().keys.any { it.name == "voltra.config.legacy_widget.legacyOnly" })
            assertFalse(snapshot.asMap().keys.any { it.name == "voltra.config.legacy_widget.both" })
            assertTrue(snapshot.asMap()[booleanPreferencesKey("voltra.config.migrated.v2")] == true)
        }
}
