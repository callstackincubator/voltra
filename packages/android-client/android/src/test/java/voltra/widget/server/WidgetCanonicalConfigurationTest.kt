package voltra.widget.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * The canonical serialization and instance key (ADR 0007).
 *
 * [`cross-platform key vector`] pins one configuration's key so Android and iOS can be checked to
 * agree without running either at the same time: `{"city":"London","units":"metric"}` must hash to
 * `eb69b5d1` on both platforms. The algorithm is FNV-1a, 32-bit, over the UTF-8 bytes of the
 * canonical string, rendered as 8 lowercase hex digits — see `WidgetCanonicalConfiguration.kt`.
 *
 * Runs under Robolectric because `WidgetCanonicalConfiguration` uses `org.json.JSONObject`, which
 * on a plain JVM test is Android's unimplemented stub.
 */
@RunWith(RobolectricTestRunner::class)
class WidgetCanonicalConfigurationTest {
    @Test
    fun `cross-platform key vector`() {
        val configuration = mapOf("city" to "London", "units" to "metric")

        assertEquals(
            """{"city":"London","units":"metric"}""",
            WidgetCanonicalConfiguration.canonicalize(configuration),
        )
        assertEquals("eb69b5d1", WidgetCanonicalConfiguration.key(configuration))
    }

    @Test
    fun `key order independence -- the same map in a different order produces the same key`() {
        val a = linkedMapOf("city" to "London", "units" to "metric")
        val b = linkedMapOf("units" to "metric", "city" to "London")

        assertEquals(WidgetCanonicalConfiguration.key(a), WidgetCanonicalConfiguration.key(b))
        assertEquals(WidgetCanonicalConfiguration.canonicalize(a), WidgetCanonicalConfiguration.canonicalize(b))
    }

    @Test
    fun `identical maps produce identical output`() {
        val a = mapOf("a" to "1", "b" to "2")
        val b = mapOf("b" to "2", "a" to "1")

        assertEquals(WidgetCanonicalConfiguration.canonicalize(a), WidgetCanonicalConfiguration.canonicalize(b))
        assertEquals(WidgetCanonicalConfiguration.key(a), WidgetCanonicalConfiguration.key(b))
    }

    @Test
    fun `a changed value changes the key`() {
        val london = mapOf("city" to "London", "units" to "metric")
        val paris = mapOf("city" to "Paris", "units" to "metric")

        assertEquals("eb69b5d1", WidgetCanonicalConfiguration.key(london))
        assertEquals("8e22a4e8", WidgetCanonicalConfiguration.key(paris))
        assert(WidgetCanonicalConfiguration.key(london) != WidgetCanonicalConfiguration.key(paris))
    }

    @Test
    fun `no instance or configuration for an empty map`() {
        assertNull(WidgetCanonicalConfiguration.canonicalize(emptyMap()))
        assertNull(WidgetCanonicalConfiguration.key(emptyMap()))
    }

    @Test
    fun `keys are sorted by code point, not by locale collation`() {
        // Under a locale-aware sort "Z" can come before "a"; code point order never does.
        val configuration = mapOf("Z" to "1", "a" to "2")

        assertEquals("""{"Z":"1","a":"2"}""", WidgetCanonicalConfiguration.canonicalize(configuration))
    }

    @Test
    fun `serialization has no whitespace and values are JSON strings`() {
        val configuration = mapOf("q" to "a b", "n" to "42")

        assertEquals("""{"n":"42","q":"a b"}""", WidgetCanonicalConfiguration.canonicalize(configuration))
    }

    @Test
    fun `escaping vector matches iOS -- slash, quotes, backslash, controls and non-ASCII`() {
        val configuration =
            mapOf(
                "path" to "a/b",
                "text" to "say \"hi\"\t\n",
                "unicode" to "Zürich",
                "ctrl" to "\u0001",
                "back" to "a\\b",
            )

        assertEquals(
            "{\"back\":\"a\\\\b\",\"ctrl\":\"\\u0001\",\"path\":\"a/b\",\"text\":\"say \\\"hi\\\"\\t\\n\",\"unicode\":\"Zürich\"}",
            WidgetCanonicalConfiguration.canonicalize(configuration),
        )
        assertEquals("0647aa90", WidgetCanonicalConfiguration.key(configuration))
    }
}
