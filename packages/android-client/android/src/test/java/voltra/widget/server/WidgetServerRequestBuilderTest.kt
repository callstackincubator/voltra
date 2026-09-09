package voltra.widget.server

import android.content.Context
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment

/** The request contract every backend sees, pinned down without a network. */
@RunWith(RobolectricTestRunner::class)
class WidgetServerRequestBuilderTest {
    private val context: Context = RuntimeEnvironment.getApplication()
    private val scope = WidgetScope.of("portfolio")

    private fun settings(
        url: String? = "https://api.example.com/widgets/portfolio",
        enabled: Boolean = true,
        method: String = "GET",
        query: Map<String, String> = emptyMap(),
        headers: Map<String, String> = emptyMap(),
        body: String? = null,
    ) = ResolvedWidgetServerSettings(
        url = url,
        intervalMinutes = 15,
        enabled = enabled,
        method = method,
        query = query,
        headers = headers,
        body = body,
    )

    @Test
    fun `sends the Voltra query parameters every backend can rely on`() {
        val request = WidgetServerRequestBuilder.build(context, scope, settings())!!
        val query = request.url.query

        assertTrue(query.contains("widgetId=portfolio"))
        assertTrue(query.contains("platform=android"))
        assertTrue(query.contains("theme="))
        assertTrue(query.contains("locale="))
    }

    @Test
    fun `does not send family, because one fetch serves every size of a Dynamic Widget`() {
        val request = WidgetServerRequestBuilder.build(context, scope, settings())!!

        assertFalse(request.url.query.contains("family="))
    }

    @Test
    fun `keeps the path and any query the configured url already had`() {
        val request =
            WidgetServerRequestBuilder.build(
                context,
                scope,
                settings(url = "https://api.example.com/widgets?tenant=acme"),
            )!!

        assertEquals("/widgets", request.url.path)
        assertTrue(request.url.query.contains("tenant=acme"))
    }

    @Test
    fun `appends the app's own query parameters`() {
        val request = WidgetServerRequestBuilder.build(context, scope, settings(query = mapOf("account" to "42")))!!

        assertTrue(request.url.query.contains("account=42"))
    }

    @Test
    fun `sends Accept and a Voltra user agent, and lets the app add headers`() {
        val request =
            WidgetServerRequestBuilder.build(
                context,
                scope,
                settings(
                    headers =
                        mapOf("Authorization" to "Bearer t"),
                ),
            )!!

        assertEquals("application/json", request.headers["Accept"])
        assertTrue(request.headers["User-Agent"]!!.startsWith("VoltraWidget/"))
        assertEquals("Bearer t", request.headers["Authorization"])
    }

    @Test
    fun `sends If-None-Match only when an etag was carried over`() {
        val withEtag = WidgetServerRequestBuilder.build(context, scope, settings(), etag = "\"abc\"")!!
        val without = WidgetServerRequestBuilder.build(context, scope, settings())!!

        assertEquals("\"abc\"", withEtag.headers["If-None-Match"])
        assertFalse(without.headers.containsKey("If-None-Match"))
    }

    @Test
    fun `sends a body with POST and declares its content type`() {
        val request = WidgetServerRequestBuilder.build(context, scope, settings(method = "POST", body = "{\"a\":1}"))!!

        assertEquals("POST", request.method)
        assertEquals("application/json", request.headers["Content-Type"])
        assertEquals("{\"a\":1}", String(request.body!!, Charsets.UTF_8))
    }

    @Test
    fun `drops a body on GET, which HttpURLConnection would otherwise turn into a POST`() {
        val request = WidgetServerRequestBuilder.build(context, scope, settings(method = "GET", body = "{\"a\":1}"))!!

        assertEquals("GET", request.method)
        assertNull(request.body)
        assertFalse(request.headers.containsKey("Content-Type"))
    }

    @Test
    fun `uppercases the method so a lowercase setting still reaches the right verb`() {
        assertEquals("PATCH", WidgetServerRequestBuilder.build(context, scope, settings(method = "patch"))!!.method)
    }

    @Test
    fun `builds nothing when there is no url or fetching is off`() {
        assertNull(WidgetServerRequestBuilder.build(context, scope, settings(url = null)))
        assertNull(WidgetServerRequestBuilder.build(context, scope, settings(enabled = false)))
    }
}
