package voltra.widget.server

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Runs under Robolectric: `WidgetScope.of(id, configuration)` hashes through `org.json.JSONObject`. */
@RunWith(RobolectricTestRunner::class)
class WidgetScopeTest {
    @Test
    fun `Widget storageKey is the bare widget id`() {
        assertEquals("weather", WidgetScope.Widget("weather").storageKey)
    }

    @Test
    fun `Instance storageKey appends the key, so widget-scoped records written today keep their keys`() {
        val scope = WidgetScope.Instance("weather", "eb69b5d1")

        assertEquals("weather#eb69b5d1", scope.storageKey)
        assertEquals("weather", scope.widgetId)
    }

    @Test
    fun `of(widgetId, configuration) resolves to Widget for an empty configuration`() {
        val scope = WidgetScope.of("weather", emptyMap())

        assertTrue(scope is WidgetScope.Widget)
        assertEquals("weather", scope.storageKey)
    }

    @Test
    fun `of(widgetId, configuration) resolves to Instance for a non-empty configuration`() {
        val scope = WidgetScope.of("weather", mapOf("city" to "London", "units" to "metric"))

        assertTrue(scope is WidgetScope.Instance)
        assertEquals("eb69b5d1", (scope as WidgetScope.Instance).key)
        assertEquals("weather#eb69b5d1", scope.storageKey)
    }
}
