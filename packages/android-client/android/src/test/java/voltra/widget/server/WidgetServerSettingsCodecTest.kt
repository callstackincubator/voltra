package voltra.widget.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class WidgetServerSettingsCodecTest {
    @Test
    fun `round-trips every field`() {
        val settings =
            WidgetServerUpdateSettings(
                url = "https://api.example.com/portfolio",
                intervalMinutes = 30,
                enabled = false,
                method = "POST",
                query = mapOf("account" to "1", "range" to "1d"),
                headers = mapOf("Authorization" to "Bearer token"),
                body = "{\"ids\":[1,2]}",
            )

        assertEquals(settings, WidgetServerSettingsCodec.decode(WidgetServerSettingsCodec.encode(settings)))
    }

    @Test
    fun `keeps unset fields unset, so a layer that says nothing stays silent`() {
        val decoded =
            WidgetServerSettingsCodec.decode(
                WidgetServerSettingsCodec.encode(WidgetServerUpdateSettings(url = "https://a")),
            )

        assertEquals("https://a", decoded?.url)
        assertNull(decoded?.intervalMinutes)
        assertNull(decoded?.enabled)
        assertNull(decoded?.method)
        assertNull(decoded?.headers)
        assertNull(decoded?.query)
        assertNull(decoded?.body)
    }

    @Test
    fun `distinguishes enabled false from unset`() {
        val decoded =
            WidgetServerSettingsCodec.decode(
                WidgetServerSettingsCodec.encode(WidgetServerUpdateSettings(enabled = false)),
            )

        assertEquals(false, decoded?.enabled)
    }

    @Test
    fun `an empty map is preserved, so clearing headers is not the same as never setting them`() {
        val decoded =
            WidgetServerSettingsCodec.decode(
                WidgetServerSettingsCodec.encode(WidgetServerUpdateSettings(headers = emptyMap())),
            )

        assertEquals(emptyMap<String, String>(), decoded?.headers)
    }

    @Test
    fun `reads an unknown version or a broken record as no opinion rather than crashing`() {
        assertNull(WidgetServerSettingsCodec.decode(null))
        assertNull(WidgetServerSettingsCodec.decode(""))
        assertNull(WidgetServerSettingsCodec.decode("not json"))
        assertNull(WidgetServerSettingsCodec.decode("{\"widgetServerSettingsVersion\":99,\"widgetServerSettings\":{}}"))
    }
}
