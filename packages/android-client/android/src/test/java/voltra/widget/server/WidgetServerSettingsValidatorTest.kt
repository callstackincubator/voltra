package voltra.widget.server

import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class WidgetServerSettingsValidatorTest {
    private fun validate(
        settings: WidgetServerUpdateSettings,
        isDebugBuild: Boolean = false,
    ) = WidgetServerSettingsValidator.validate(settings, isDebugBuild)

    @Test
    fun `accepts https anywhere`() {
        assertNull(validate(WidgetServerUpdateSettings(url = "https://api.example.com/portfolio")))
    }

    @Test
    fun `rejects plain http in a release build even for a local host`() {
        assertNotNull(validate(WidgetServerUpdateSettings(url = "http://localhost:3333")))
    }

    @Test
    fun `accepts plain http to a dev host in a debug build`() {
        assertNull(validate(WidgetServerUpdateSettings(url = "http://localhost:3333"), isDebugBuild = true))
        assertNull(validate(WidgetServerUpdateSettings(url = "http://10.0.2.2:3333/widgets"), isDebugBuild = true))
    }

    @Test
    fun `rejects plain http to another host even in a debug build`() {
        assertNotNull(validate(WidgetServerUpdateSettings(url = "http://api.example.com"), isDebugBuild = true))
    }

    @Test
    fun `rejects a url with no scheme or no host`() {
        assertNotNull(validate(WidgetServerUpdateSettings(url = "api.example.com/portfolio")))
        assertNotNull(validate(WidgetServerUpdateSettings(url = "https://")))
        assertNotNull(validate(WidgetServerUpdateSettings(url = "  ")))
    }

    @Test
    fun `rejects a query key Voltra already sends`() {
        val error = validate(WidgetServerUpdateSettings(query = mapOf("theme" to "dark")))

        assertNotNull(error)
        assertTrue(error!!.contains("reserved"))
    }

    @Test
    fun `rejects an instance key, which is reserved for per-placement fetches`() {
        assertNotNull(validate(WidgetServerUpdateSettings(query = mapOf("instance" to "1"))))
    }

    @Test
    fun `rejects a method neither platform can send`() {
        assertNotNull(validate(WidgetServerUpdateSettings(method = "TRACE")))
        assertNull(validate(WidgetServerUpdateSettings(method = "patch")))
    }

    @Test
    fun `rejects a non-positive interval`() {
        assertNotNull(validate(WidgetServerUpdateSettings(intervalMinutes = 0)))
        assertNotNull(validate(WidgetServerUpdateSettings(intervalMinutes = -5)))
    }

    @Test
    fun `accepts a body with GET, which the request builder drops with a warning`() {
        assertNull(validate(WidgetServerUpdateSettings(method = "GET", body = "{\"a\":1}")))
    }

    @Test
    fun `rejects a layer larger than the storage cap`() {
        val huge = "x".repeat(WidgetServerUpdateDefaults.MAX_LAYER_BYTES + 1)

        assertNotNull(validate(WidgetServerUpdateSettings(body = huge)))
    }
}
