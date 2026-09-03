package voltra.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/**
 * Covers the read-side behaviour of [VoltraWidgetManager] that this module's dependency graph
 * lets us reach without a real `assets/voltra_initial_states.json` (this library module ships no
 * assets of its own): SharedPreferences payload data takes priority, and absence of both sources
 * yields null. The `__voltraLocales` selection itself -- shared with the Dynamic Widget
 * placeholder reader -- is covered exhaustively by [InitialStateLocalePickerTest] and by
 * `voltra.dynamicwidget.DynamicWidgetPlaceholderStoreTest`, which reads the same asset format
 * through an injectable source.
 */
@RunWith(RobolectricTestRunner::class)
class VoltraWidgetManagerTest {
    @Test
    fun readWidgetJsonPrefersSharedPreferencesOverAsset() {
        val manager = VoltraWidgetManager(RuntimeEnvironment.getApplication())
        manager.writeWidgetData("payload-widget", """{"variants":[{"width":1,"height":1}]}""", null)

        assertEquals(
            """{"variants":[{"width":1,"height":1}]}""",
            manager.readWidgetJson("payload-widget"),
        )
    }

    @Test
    fun readWidgetJsonReturnsNullWhenNothingIsStoredOrBaked() {
        val manager = VoltraWidgetManager(RuntimeEnvironment.getApplication())

        assertNull(manager.readWidgetJson("never-written-widget"))
    }
}
