package voltra.dynamicwidget.serverupdate

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class DynamicWidgetServerPropsTest {
    private fun parse(body: String) = DynamicWidgetServerProps.parse(body)

    private fun invalidReason(body: String): String {
        val result = parse(body)

        assertTrue("expected $body to be rejected", result is DynamicWidgetPropsParseResult.Invalid)

        return (result as DynamicWidgetPropsParseResult.Invalid).reason
    }

    @Test
    fun `accepts a JSON object and hands it through verbatim`() {
        val result = parse("""{"total":42,"holdings":[{"symbol":"AAPL"}]}""")

        assertTrue(result is DynamicWidgetPropsParseResult.Props)
        assertEquals(
            """{"total":42,"holdings":[{"symbol":"AAPL"}]}""",
            (result as DynamicWidgetPropsParseResult.Props).json,
        )
    }

    @Test
    fun `accepts an empty object, which is what a widget already gets before its first props`() {
        assertTrue(parse("{}") is DynamicWidgetPropsParseResult.Props)
    }

    @Test
    fun `rejects a top-level array, primitive or null`() {
        assertTrue(invalidReason("[1,2,3]").contains("array"))
        assertTrue(invalidReason("42").contains("JSON object"))
        assertTrue(invalidReason("\"hello\"").contains("JSON object"))
        assertTrue(invalidReason("null").contains("JSON object"))
    }

    @Test
    fun `rejects a body that is not JSON at all`() {
        assertTrue(invalidReason("<html>nope</html>").contains("JSON object"))
        assertTrue(invalidReason("   ").contains("empty"))
    }

    @Test
    fun `rejects a Voltra payload by name, because that is the mistake sharing the config key invites`() {
        val reason = invalidReason("""{"v":1,"variants":{"180x110":{"t":1}}}""")

        assertTrue(reason.contains("Voltra payload"))
        assertTrue(reason.contains("entry"))
    }

    @Test
    fun `rejects a payload that carries shared elements instead of variants`() {
        assertTrue(invalidReason("""{"v":1,"e":[{"t":1}]}""").contains("Voltra payload"))
    }

    @Test
    fun `does not mistake props that happen to have a v key for a payload`() {
        assertTrue(parse("""{"v":1,"label":"hi"}""") is DynamicWidgetPropsParseResult.Props)
        assertTrue(parse("""{"v":"1.2.3","variants":{"a":1}}""") is DynamicWidgetPropsParseResult.Props)
    }
}
