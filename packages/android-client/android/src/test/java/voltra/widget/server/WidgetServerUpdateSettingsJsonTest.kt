package voltra.widget.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** What `setWidgetServerUpdate` sends over the bridge, and what it becomes on this side. */
@RunWith(RobolectricTestRunner::class)
class WidgetServerUpdateSettingsJsonTest {
    private fun parsed(json: String): WidgetServerUpdateSettings {
        val result = WidgetServerUpdateSettingsJson.parse(json)

        assertTrue("expected $json to parse", result is WidgetServerUpdateSettingsJson.Result.Parsed)

        return (result as WidgetServerUpdateSettingsJson.Result.Parsed).settings
    }

    @Test
    fun `reads every field an app can set`() {
        val settings =
            parsed(
                """
                {
                  "url": "https://api.example.com/p",
                  "intervalMinutes": 30,
                  "enabled": false,
                  "method": "POST",
                  "query": {"account": "1"},
                  "headers": {"Authorization": "Bearer t"},
                  "body": {"ids": [1, 2]}
                }
                """.trimIndent(),
            )

        assertEquals("https://api.example.com/p", settings.url)
        assertEquals(30L, settings.intervalMinutes)
        assertEquals(false, settings.enabled)
        assertEquals("POST", settings.method)
        assertEquals(mapOf("account" to "1"), settings.query)
        assertEquals(mapOf("Authorization" to "Bearer t"), settings.headers)
        assertEquals("""{"ids":[1,2]}""", settings.body)
    }

    @Test
    fun `leaves out what the app did not set, so those layers stay silent`() {
        val settings = parsed("""{"url":"https://a"}""")

        assertNull(settings.intervalMinutes)
        assertNull(settings.enabled)
        assertNull(settings.method)
        assertNull(settings.query)
        assertNull(settings.headers)
        assertNull(settings.body)
    }

    @Test
    fun `an empty object clears nothing and sets nothing`() {
        assertTrue(parsed("{}").isEmpty)
    }

    @Test
    fun `distinguishes an explicitly empty header map from an absent one`() {
        assertEquals(emptyMap<String, String>(), parsed("""{"headers":{}}""").headers)
        assertNull(parsed("{}").headers)
    }

    @Test
    fun `uppercases the method so a lowercase one still validates`() {
        assertEquals("PATCH", parsed("""{"method":"patch"}""").method)
    }

    @Test
    fun `keeps a non-object body, which is legal JSON for a request`() {
        assertEquals("""[1,2]""", parsed("""{"body":[1,2]}""").body)
        assertEquals(""""hello"""", parsed("""{"body":"hello"}""").body)
    }

    @Test
    fun `rejects a settings value that is not a JSON object`() {
        assertTrue(WidgetServerUpdateSettingsJson.parse("[]") is WidgetServerUpdateSettingsJson.Result.Invalid)
        assertTrue(WidgetServerUpdateSettingsJson.parse("nope") is WidgetServerUpdateSettingsJson.Result.Invalid)
    }

    @Test
    fun `rejects headers or query whose values are not strings`() {
        assertTrue(
            WidgetServerUpdateSettingsJson.parse(
                """{"headers":{"X":1}}""",
            ) is WidgetServerUpdateSettingsJson.Result.Invalid,
        )
        assertTrue(
            WidgetServerUpdateSettingsJson.parse("""{"query":[]}""") is WidgetServerUpdateSettingsJson.Result.Invalid,
        )
    }
}
