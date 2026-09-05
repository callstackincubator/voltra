package voltra.widget.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * The two response headers that move the next fetch. Both are clamped where they are applied, so
 * here we only pin down the parsing.
 */
class WidgetServerFetcherHeaderTest {
    @Test
    fun `reads max-age out of a Cache-Control header, whatever else it carries`() {
        assertEquals(30L, WidgetServerFetcher.maxAgeMinutes("max-age=1800"))
        assertEquals(30L, WidgetServerFetcher.maxAgeMinutes("public, max-age=1800, must-revalidate"))
        assertEquals(30L, WidgetServerFetcher.maxAgeMinutes("Max-Age = 1800"))
    }

    @Test
    fun `rounds max-age down, so we never claim data is fresher than the server said`() {
        assertEquals(1L, WidgetServerFetcher.maxAgeMinutes("max-age=119"))
        assertEquals(0L, WidgetServerFetcher.maxAgeMinutes("max-age=30"))
    }

    @Test
    fun `ignores a Cache-Control header with no max-age`() {
        assertNull(WidgetServerFetcher.maxAgeMinutes(null))
        assertNull(WidgetServerFetcher.maxAgeMinutes("no-store"))
        assertNull(WidgetServerFetcher.maxAgeMinutes("max-age=soon"))
    }

    @Test
    fun `rounds Retry-After up, so we never retry before the server asked us to`() {
        assertEquals(1L, WidgetServerFetcher.retryAfterMinutes("1"))
        assertEquals(1L, WidgetServerFetcher.retryAfterMinutes("60"))
        assertEquals(2L, WidgetServerFetcher.retryAfterMinutes("61"))
    }

    @Test
    fun `ignores a Retry-After we cannot read as seconds`() {
        assertNull(WidgetServerFetcher.retryAfterMinutes(null))
        assertNull(WidgetServerFetcher.retryAfterMinutes("Wed, 21 Oct 2015 07:28:00 GMT"))
        assertNull(WidgetServerFetcher.retryAfterMinutes("0"))
    }
}
