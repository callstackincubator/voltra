package voltra.widget.server

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The merge rule from ADR 0002 lives in the resolver and nowhere else, so this is where it is
 * pinned down.
 */
class WidgetServerSettingsResolverTest {
    private val scope = WidgetScope.of("portfolio")

    private fun layer(
        name: String,
        settings: WidgetServerUpdateSettings?,
        serverDriven: Boolean = false,
    ) = object : WidgetServerSettingsLayer {
        override val name: String = name

        override suspend fun settings(scope: WidgetScope): WidgetServerUpdateSettings? = settings

        override suspend fun isServerDriven(scope: WidgetScope): Boolean = serverDriven
    }

    private fun resolver(
        vararg layers: WidgetServerSettingsLayer,
        revision: Long = 0L,
    ) = WidgetServerSettingsResolver(layers.toList(), revisionSource = { revision })

    @Test
    fun `takes url, interval, method and body from the highest layer that sets them`() =
        runTest {
            val resolved =
                resolver(
                    layer(
                        "config",
                        WidgetServerUpdateSettings(url = "https://config", intervalMinutes = 60),
                        serverDriven = true,
                    ),
                    layer("global", WidgetServerUpdateSettings(url = "https://global", method = "POST")),
                    layer("widget", WidgetServerUpdateSettings(url = "https://widget", body = "{\"a\":1}")),
                ).resolve(scope)

            assertEquals("https://widget", resolved.url)
            assertEquals("POST", resolved.method)
            assertEquals("{\"a\":1}", resolved.body)
            assertEquals(60L, resolved.intervalMinutes)
        }

    @Test
    fun `merges headers and query per key rather than replacing the whole map`() =
        runTest {
            val resolved =
                resolver(
                    layer("config", WidgetServerUpdateSettings(), serverDriven = true),
                    layer(
                        "credentials",
                        WidgetServerUpdateSettings(
                            headers = mapOf("Authorization" to "Bearer legacy", "X-Env" to "prod"),
                        ),
                    ),
                    layer(
                        "global",
                        WidgetServerUpdateSettings(
                            headers = mapOf("Authorization" to "Bearer new"),
                            query = mapOf("account" to "1"),
                        ),
                    ),
                    layer("widget", WidgetServerUpdateSettings(query = mapOf("range" to "1d"))),
                ).resolve(scope)

            assertEquals(mapOf("Authorization" to "Bearer new", "X-Env" to "prod"), resolved.headers)
            assertEquals(mapOf("account" to "1", "range" to "1d"), resolved.query)
        }

    @Test
    fun `fills in the defaults a fetch needs`() =
        runTest {
            val resolved =
                resolver(
                    layer("config", WidgetServerUpdateSettings(url = "https://a"), serverDriven = true),
                ).resolve(scope)

            assertEquals(WidgetServerUpdateDefaults.DEFAULT_METHOD, resolved.method)
            assertEquals(WidgetServerUpdateDefaults.DEFAULT_INTERVAL_MINUTES, resolved.intervalMinutes)
            assertTrue(resolved.enabled)
            assertTrue(resolved.query.isEmpty())
        }

    @Test
    fun `clamps the interval to what the platform can honour`() =
        runTest {
            val tooShort =
                resolver(
                    layer("config", WidgetServerUpdateSettings(intervalMinutes = 1), serverDriven = true),
                ).resolve(scope)
            val tooLong =
                resolver(
                    layer("config", WidgetServerUpdateSettings(intervalMinutes = 60 * 24 * 30), serverDriven = true),
                ).resolve(scope)

            assertEquals(WidgetServerUpdateDefaults.MIN_INTERVAL_MINUTES, tooShort.intervalMinutes)
            assertEquals(WidgetServerUpdateDefaults.MAX_INTERVAL_MINUTES, tooLong.intervalMinutes)
        }

    @Test
    fun `a widget the config layer does not know is never fetched, whatever a runtime layer says`() =
        runTest {
            val resolved =
                resolver(
                    layer("config", null, serverDriven = false),
                    layer("widget", WidgetServerUpdateSettings(url = "https://sneaky", enabled = true)),
                ).resolve(scope)

            assertNull(resolved.url)
            assertFalse(resolved.enabled)
            assertFalse(resolved.shouldFetch)
        }

    @Test
    fun `enabled false stops fetching without dropping the url`() =
        runTest {
            val resolved =
                resolver(
                    layer("config", WidgetServerUpdateSettings(url = "https://a"), serverDriven = true),
                    layer("widget", WidgetServerUpdateSettings(enabled = false)),
                ).resolve(scope)

            assertEquals("https://a", resolved.url)
            assertFalse(resolved.enabled)
            assertFalse(resolved.shouldFetch)
        }

    @Test
    fun `a server-driven widget with no url yet does not fetch`() =
        runTest {
            val resolved = resolver(layer("config", WidgetServerUpdateSettings(), serverDriven = true)).resolve(scope)

            assertNull(resolved.url)
            assertTrue(resolved.enabled)
            assertFalse(resolved.shouldFetch)
        }

    @Test
    fun `a blank url is treated as no url`() =
        runTest {
            val resolved =
                resolver(
                    layer("config", WidgetServerUpdateSettings(url = "  "), serverDriven = true),
                ).resolve(scope)

            assertNull(resolved.url)
            assertFalse(resolved.shouldFetch)
        }

    @Test
    fun `revision comes from the store so a fetcher can tell whether settings moved under it`() =
        runTest {
            assertEquals(7L, resolver(layer("config", null), revision = 7L).revision(scope))
        }
}
