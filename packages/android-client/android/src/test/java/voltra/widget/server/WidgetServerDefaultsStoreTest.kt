package voltra.widget.server

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * The generated asset is the build-time half of the settings stack, and the only thing that knows
 * which widgets are server-driven at all.
 */
@RunWith(RobolectricTestRunner::class)
class WidgetServerDefaultsStoreTest {
    private fun store(asset: String?) = WidgetServerDefaultsStore { asset }

    @Test
    fun `reads url, interval and refresh for a widget`() {
        val defaults =
            store("""{"portfolio":{"url":"https://api.example.com/p","intervalMinutes":30,"refresh":true}}""")
                .defaults("portfolio")

        assertEquals("https://api.example.com/p", defaults?.url)
        assertEquals(30L, defaults?.intervalMinutes)
        assertEquals(true, defaults?.refresh)
    }

    @Test
    fun `treats a widget with no url as server-driven, waiting for one at runtime`() {
        val store = store("""{"portfolio":{"intervalMinutes":15,"refresh":false}}""")

        assertTrue(store.isServerDriven("portfolio"))
        assertNull(store.defaults("portfolio")?.url)
    }

    @Test
    fun `a widget missing from the asset is not server-driven`() {
        val store = store("""{"portfolio":{"intervalMinutes":15,"refresh":false}}""")

        assertFalse(store.isServerDriven("local"))
        assertNull(store.defaults("local"))
    }

    @Test
    fun `an app with no server-driven widgets ships no asset and nothing is server-driven`() {
        val store = store(null)

        assertFalse(store.isServerDriven("portfolio"))
        assertEquals(emptySet<String>(), store.serverDrivenWidgetIds())
    }

    @Test
    fun `a broken asset is read as no server-driven widgets rather than crashing every fetch`() {
        assertEquals(emptySet<String>(), store("not json").serverDrivenWidgetIds())
    }

    @Test
    fun `clamps an interval the asset could not have caught, such as a hand-edited file`() {
        assertEquals(
            WidgetServerUpdateDefaults.MIN_INTERVAL_MINUTES,
            store("""{"portfolio":{"intervalMinutes":1}}""").defaults("portfolio")?.intervalMinutes,
        )
    }

    @Test
    fun `lists every server-driven widget, whichever engine renders it`() {
        val store = store("""{"portfolio":{"intervalMinutes":15},"prices":{"intervalMinutes":60}}""")

        assertEquals(setOf("portfolio", "prices"), store.serverDrivenWidgetIds())
    }

    @Test
    fun `feeds the config layer, which is what stops a runtime url reaching a local widget`() =
        runTest {
            val layer =
                ConfigWidgetServerSettingsLayer(store("""{"portfolio":{"url":"https://a","intervalMinutes":30}}"""))

            assertEquals("https://a", layer.settings(WidgetScope.of("portfolio"))?.url)
            assertNull(layer.settings(WidgetScope.of("local")))
            assertTrue(layer.isServerDriven(WidgetScope.of("portfolio")))
            assertFalse(layer.isServerDriven(WidgetScope.of("local")))
        }
}
